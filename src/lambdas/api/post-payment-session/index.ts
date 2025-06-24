import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { corsErrorResponse } from '@common/cors-middleware';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { metrics } from '@common/powertools';
import type { Identity, IdpName, StripeCustomerId } from '@notifycal/shared/types';
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
import { readPostPaymentCheckoutSessionConfig } from './config';
import { type Event, eventSchema } from './schemas';

function createCustomerOrRetrieve(
  identity: Identity<IdpName>,
  userBaseStore: UserBaseStore<IdpName>,
  stripeService: StripeService
): Promise<StripeCustomerId> {
  return userBaseStore.getStripeCustomerId(identity.userId).then((stripeUserIrOrNot) => {
    if (stripeUserIrOrNot) {
      return Promise.resolve(stripeUserIrOrNot);
    } else {
      return stripeService
        .createCustomer(identity)
        .then((stripeCustomerId) =>
          userBaseStore
            .updateStripeCustomerId(identity.userId, stripeCustomerId)
            .then(() => stripeCustomerId)
        );
    }
  });
}

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const { userId, idp, idpId, email } = event.requestContext.authorizer.payload;
  const identity = { userId, idp, idpId, email };
  const { stripeAuthConfig, stripeCheckoutConfig, paymentPlans, userBaseStoreConfig } =
    event.lambdaConfig;
  const apiKey = stripeAuthConfig.apiKey;
  const { successRedirectUrlPath, cancelRedirectUrlPath, taxId } = stripeCheckoutConfig;
  const { tier, language } = event.body;
  const selectedTier = paymentPlans.tiers[tier];

  const frontendUrl = validateRequestHeaderOrigin({
    headers: event.headers || {},
    lambdaConfig: event.lambdaConfig
  });
  if (!frontendUrl) {
    return corsErrorResponse;
  }
  const successRedirectUrl = `${frontendUrl}${successRedirectUrlPath}` as Url;
  const cancelRedirectUrl = `${frontendUrl}${cancelRedirectUrlPath}` as Url;

  const dimensions: MetricDimensions = {
    tier: selectedTier.id,
    userId: userId
  };
  const userBaseStore = UserBaseStore.withConfig(userBaseStoreConfig);
  const stripeService = new StripeService(apiKey);
  return createCustomerOrRetrieve(identity, userBaseStore, stripeService)
    .then((stripeCustomerId) =>
      stripeService.createCheckoutSession(
        stripeCustomerId,
        identity,
        selectedTier,
        language,
        successRedirectUrl,
        cancelRedirectUrl,
        taxId
      )
    )
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
  readPostPaymentCheckoutSessionConfig,
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
