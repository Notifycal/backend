import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { corsErrorResponse } from '@common/cors-middleware';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { logger, metrics } from '@common/powertools';
import type { Url } from '@own-types/model';
import {
  errorHandler,
  successHandler,
  validateRequestHeaderOrigin
} from '@services/common/api-response-handlers';
import type { MetricDimensions } from '@services/observability/metrics';
import { UserBaseStore } from '@services/stores/user-base-store';
import { StripeService } from '@services/stripe';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { readPostCustomerPortalSessionConfig } from './config';
import { type Event, eventSchema } from './schemas';

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _ctx: Context
): Promise<APIGatewayProxyResult> {
  const { userId } = event.requestContext.authorizer.payload;
  const { userBaseStoreConfig, stripeAuthConfig, stripeCustomerPortalConfig } = event.lambdaConfig;
  const apiKey = stripeAuthConfig.apiKey;

  const userBaseStore = UserBaseStore.withConfig(userBaseStoreConfig, logger);
  const stripeService = await StripeService.withConfig(apiKey);

  const frontendUrl = validateRequestHeaderOrigin({
    headers: event.headers || {},
    lambdaConfig: event.lambdaConfig
  });
  if (!frontendUrl) {
    return Promise.resolve(corsErrorResponse);
  }
  const returnUrl = `${frontendUrl}${stripeCustomerPortalConfig.returnUrlPath}` as Url;

  const dimensions: MetricDimensions = {
    userId: userId
  };

  return userBaseStore.getStripeCustomerId(userId).then((stripeCustomerId) => {
    if (!stripeCustomerId) {
      metrics.addMetric('CustomerPortalSessionNoCustomer', MetricUnit.Count, 1, dimensions);
      return errorHandler(500)(
        'User does not have a Stripe customer ID whereas it should have one. This is totally unexpected'
      );
    }
    return stripeService
      .createCustomerPortalSession(
        stripeCustomerId,
        returnUrl,
        stripeCustomerPortalConfig.configId,
        event.body.flowType
      )
      .then(
        (sessionUrl) => {
          if (sessionUrl) {
            metrics.addMetric('CustomerPortalSessionCreated', MetricUnit.Count, 1, dimensions);
            return successHandler()({ result: { url: sessionUrl } });
          }
          metrics.addMetric('CustomerPortalSessionCancelled', MetricUnit.Count, 1, dimensions);
          return errorHandler(500)('No customer portal session was created for the user');
        },
        (error) => {
          metrics.addMetric('CustomerPortalSessionFailed', MetricUnit.Count, 1, dimensions);
          return errorHandler(500)(
            'There was an error creating a customer portal session for the user',
            {
              error
            }
          );
        }
      );
  });
}

const handler = protectedEndpointMiddleware(
  () => readPostCustomerPortalSessionConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
