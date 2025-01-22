import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { verifyGoogleIdentity } from '@services/google/oauth';
import { type LoginConfig, readLoginConfig } from './config';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { z } from 'zod';
import { _successHandler, buildJwtsAndStoreRefreshJwt, signInOrUpUser } from '@services/login';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';
import { errorHandler } from '@services/common/api-response-handlers';
import { eventSchema } from '@model/ApiGatewayEvents';
import { extractIdentity } from '@model/UserStoreRecord';
import { isValidIdpName, type Identity, type IdpName } from '@model/Identity';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { IdpConfigs } from '@model/Config';

export const bodySchema = z.object({
  googleCode: z.string()
});
const schema = eventSchema<LoginConfig>().extend({
  body: JSONStringified(bodySchema)
});
export type Event = z.infer<typeof schema>;

function verifyIdentity(
  event: Event,
  idpQueryParameter: string | undefined,
  config: IdpConfigs
): Promise<[Identity<IdpName>, AuthorizationForIdp<IdpName>]> {
  if (isValidIdpName(idpQueryParameter) && idpQueryParameter === 'google.com') {
    return verifyGoogleIdentity(event.body.googleCode, config['google.com']);
  }
  return Promise.reject(
    new Error(`Idp identity verification not implemented. Query parameter: ${idpQueryParameter}`)
  );
}

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.endpointConfig;
  const idpQueryPath = event.queryStringParameters?.['idp'];
  const store = new RefreshTokenBaseStore(config.refreshTokenBaseStoreConfig);
  return verifyIdentity(event, idpQueryPath, config.idpConfigs)
    .then(([identity, idpAuthorization]) =>
      signInOrUpUser(identity, idpAuthorization, config.userBaseStoreConfig)
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

export const handler = unprotectedEndpointMiddleware(
  () => readLoginConfig(),
  schema
).handler<Event>(lambdaHandler);
