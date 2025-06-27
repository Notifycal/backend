import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { unprotectedCrossDomainEndpointMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { IdpConfigs } from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import { apiEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import type { Identity, IdpName } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { _successHandler, signInOrUp } from '@services/auth';
import { errorHandler } from '@services/common/api-response-handlers';
import { GoogleOAuth } from '@services/google/oauth';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { readLoginConfig, type LoginConfig } from './config';

export const bodySchema = z.object({
  googleCode: z.string()
});
const schema = apiEventSchema<LoginConfig>().extend({
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
  const origin = event.headers?.origin || event.headers?.Origin || event.headers?.ORIGIN;
  if (isValidIdpName(idpQueryParameter) && idpQueryParameter === 'google.com' && origin) {
    return GoogleOAuth.withConfig(config['google.com'], origin as Url, logger).verifyIdentity(
      event.body.googleCode
    );
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
  const config = event.lambdaConfig;
  const idpQueryPath = event.queryStringParameters?.['idp'];

  return verifyIdentity(event, idpQueryPath, config.idpConfigs)
    .then(([identity, idpAuthorization]) => {
      logger.appendKeys({
        userId: identity.userId,
        idp: identity.idp,
        idpId: identity.idpId
      });
      return signInOrUp(identity, idpAuthorization, config, logger)
        .then(_successHandler)
        .catch(errorHandler(500));
    })
    .catch(errorHandler(401));
}

const handler = unprotectedCrossDomainEndpointMiddleware(readLoginConfig, schema).handler<Event>(
  lambdaHandler
);

module.exports = { handler };
