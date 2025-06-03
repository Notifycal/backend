import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { logger, metrics } from '@common/powertools';
import type { MetricDimensions } from '@services/observability/metrics';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { StripeService } from '../../../services/stripe';
import { readPostPaymentCheckoutSessionConfig } from './config';
import { type Event, eventSchema } from './schemas';

const failureResponse: APIGatewayProxyResult = {
  statusCode: 500,
  body: JSON.stringify({ message: 'Failed to create checkout session' })
};

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const { userId, email } = event.requestContext.authorizer.payload;
  const apiKey = event.lambdaConfig.stripeAuthConfig.apiKey;
  const { successRedirectUrl, cancelRedirectUrl, tiers } = event.lambdaConfig.stripeCheckoutConfig;
  const { tier, language } = event.body;
  const selectedTier = tiers[tier];

  const dimensions: MetricDimensions = {
    tier: selectedTier.id,
    userId: userId
  };
  return new StripeService(apiKey)
    .createCheckoutSession(
      userId,
      email,
      selectedTier,
      language,
      successRedirectUrl,
      cancelRedirectUrl
    )
    .then(
      (sessionUrl) => {
        if (sessionUrl) {
          metrics.addMetric('PaymentSessionCreated', MetricUnit.Count, 1, dimensions);
          return {
            statusCode: 200,
            body: JSON.stringify({ url: sessionUrl })
          };
        } else {
          logger.error(`No payment session was created for the user`);
          metrics.addMetric('PaymentSessionCancelled', MetricUnit.Count, 1, dimensions);
          return failureResponse;
        }
      },
      (error) => {
        logger.error(`There was an error creating a payment session for the user`, { error });
        metrics.addMetric('PaymentSessionFailed', MetricUnit.Count, 1, dimensions);
        return failureResponse;
      }
    );
}

const handler = protectedEndpointMiddleware(
  () => readPostPaymentCheckoutSessionConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
