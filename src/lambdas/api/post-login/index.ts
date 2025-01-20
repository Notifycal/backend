import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { verifyGoogleIdentity } from '@services/google/google-oauth';
import { type LoginConfig, readLoginConfig } from './config';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { z } from 'zod';
import { _successHandler, buildJwtsAndStoreRefreshJwt, signInOrUpUser } from '@services/login';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';
import { errorHandler } from '@services/common/api-response-handlers';
import { eventSchema } from '@model/ApiGatewayEvents';
import { extractIdentity } from '@model/UserStoreRecord';
import type { Identity, IdpName } from '@model/Identity';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import { throwError } from '@services/common/error-handling';

export const requestPayloadSchemas: Record<IdpName, z.ZodTypeAny> = {
  'google.com': z.object({
    googleCode: z.string()
  })
};
const y = Object.entries(requestPayloadSchemas).map(
  ([key, value]) =>
    z.object({
      [key]: value
    })
  // above "as" is necessary cause Zod obligues to use z.union with an array of, at least, 2 items
) as unknown as readonly [z.ZodTypeAny, z.ZodTypeAny, ...Array<z.ZodTypeAny>];
const schema = eventSchema<LoginConfig>().extend({
  body: JSONStringified(z.union(y))
});
export type Event = z.infer<typeof schema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.endpointConfig;
  const idpQueryPath = event.queryStringParameters?.['idp'];
  const store = new RefreshTokenBaseStore(config.refreshTokenBaseStoreConfig);
  // eslint-disable-next-line no-use-before-define
  return verifyIdentity(idpQueryPath, event, config)
    .then(([googleIdentity, googleAuthorization]) =>
      signInOrUpUser(googleIdentity, googleAuthorization, config.userBaseStoreConfig)
        .then((user) =>
          buildJwtsAndStoreRefreshJwt(
            extractIdentity(user),
            config.encodeAccessJwtConfig,
            config.encodeRefreshJwtConfig,
            store
          )
        )
        .then(_successHandler)
        .catch(errorHandler(500))
    )
    .catch(errorHandler(401));
}

function verifyIdentity(
  idpQueryParameter: string | undefined,
  event: Event,
  config: LoginConfig
): Promise<[Identity<IdpName>, AuthorizationForIdp<IdpName>]> {
  if (idpQueryParameter === 'google.com') {
    return verifyGoogleIdentity(
      event.body?.['google.com']?.['googleCode'] as unknown as string,
      config.googleOAuthClientConfig
    );
  }
  throwError(`Non implemented Idp. Query parameter: ${idpQueryParameter}`);
}

export const handler = unprotectedEndpointMiddleware(
  () => readLoginConfig(),
  schema
).handler<Event>(lambdaHandler);
