import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { readPostPaymentCheckoutSessionConfig } from './config';
import { type Event, eventSchema } from './schemas';
import { StripeCheckoutService } from './stripe';

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
  const selectedTier = tiers[event.body.tier];

  return new StripeCheckoutService()
    .createCheckoutSession(
      userId,
      email,
      selectedTier,
      event.body.language,
      successRedirectUrl,
      cancelRedirectUrl,
      apiKey
    )
    .then(
      (sessionUrl) => {
        if (sessionUrl) {
          return {
            statusCode: 200,
            body: JSON.stringify({ url: sessionUrl })
          };
        } else {
          logger.error(`No payment session was created for the user`);
          return failureResponse;
        }
      },
      (error) => {
        logger.error(`There was an error creating a payment session for the user`, { error });
        return failureResponse;
      }
    );
}

const handler = protectedEndpointMiddleware(
  () => readPostPaymentCheckoutSessionConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
