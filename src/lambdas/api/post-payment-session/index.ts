import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { metrics } from '@common/powertools';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import type { MetricDimensions } from '@services/observability/metrics';
import { StripeService } from '@services/stripe';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { readPostPaymentCheckoutSessionConfig } from './config';
import { type Event, eventSchema } from './schemas';

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const { userId, idp, idpId, email } = event.requestContext.authorizer.payload;
  const identity = { userId, idp, idpId, email };
  const { stripeAuthConfig, stripeCheckoutConfig, paymentPlans } = event.lambdaConfig;
  const apiKey = stripeAuthConfig.apiKey;
  const { successRedirectUrl, cancelRedirectUrl } = stripeCheckoutConfig;
  const { tier, language } = event.body;
  const selectedTier = paymentPlans.tiers[tier];

  const dimensions: MetricDimensions = {
    tier: selectedTier.id,
    userId: userId
  };
  return new StripeService(apiKey)
    .createCheckoutSession(identity, selectedTier, language, successRedirectUrl, cancelRedirectUrl)
    .then(
      (sessionUrl) => {
        if (sessionUrl) {
          metrics.addMetric('PaymentSessionCreated', MetricUnit.Count, 1, dimensions);
          return successHandler()({ result: { url: sessionUrl } });
        } else {
          metrics.addMetric('PaymentSessionCancelled', MetricUnit.Count, 1, dimensions);
          return errorHandler(500)(`No payment session was created for the user`);
        }
      },
      (error) => {
        metrics.addMetric('PaymentSessionFailed', MetricUnit.Count, 1, dimensions);
        return errorHandler(500)(`There was an error creating a payment session for the user`, {
          error
        });
      }
    );
}

const handler = protectedEndpointMiddleware(
  () => readPostPaymentCheckoutSessionConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
