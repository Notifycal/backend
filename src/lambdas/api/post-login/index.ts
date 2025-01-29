import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { eventSchema } from '@model/api/ApiGatewayEvents';
import type { IdpConfigs } from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import { extractIdentity } from '@model/store/UserStoreRecord';
import type { Identity, IdpName } from '@notifycal/shared/types';
import { errorHandler } from '@services/common/api-response-handlers';
import { GoogleOAuth } from '@services/google/oauth';
import { _successHandler, buildJwtsAndStoreRefreshJwt, signInOrUpUser } from '@services/login';
import { RefreshTokenBaseStore } from '@services/stores/refresh-token-base-store';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { readLoginConfig, type LoginConfig } from './config';

export const bodySchema = z.object({
  googleCode: z.string()
});
const schema = eventSchema<LoginConfig>().extend({
  body: JSONStringified(bodySchema)
});
export type Event = z.infer<typeof schema>;

function isValidIdpName(value: string | undefined): value is IdpName {
  const validIdpNames: Array<IdpName> = ['google.com'];
  return validIdpNames.includes(value as IdpName);
}

function verifyIdentity(
  event: Event,
  idpQueryParameter: string | undefined,
  config: IdpConfigs
): Promise<[Identity<IdpName>, AuthorizationForIdp<IdpName>]> {
  if (isValidIdpName(idpQueryParameter) && idpQueryParameter === 'google.com') {
    return GoogleOAuth.withConfig(config['google.com']).verifyIdentity(event.body.googleCode);
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
