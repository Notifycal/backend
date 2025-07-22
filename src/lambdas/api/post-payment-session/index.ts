import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { corsErrorResponse } from '@common/cors-middleware';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { logger, metrics } from '@common/powertools';
import type { Tier, Topup } from '@model/PaymentPlans';
import type { IdpName, StripeCustomerId, UserIdentity } from '@notifycal/shared/types';
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
import { match, P } from 'ts-pattern';
import { readPostPaymentCheckoutSessionConfig } from './config';
import { type Event, eventSchema } from './schemas';

function createCustomerOrRetrieve(
  userIdentity: UserIdentity<IdpName>,
  userBaseStore: UserBaseStore<IdpName>,
  stripeService: StripeService
): Promise<StripeCustomerId> {
  return userBaseStore
    .getStripeCustomerId(userIdentity.userId)
    .catch((error) => {
      logger.error('Failed to get stripe customer ID from database', {
        userId: userIdentity.userId,
        error
      });
      throw error;
    })
    .then((stripeCustomerIdOrNot) => {
      if (stripeCustomerIdOrNot) {
        return Promise.resolve(stripeCustomerIdOrNot);
      } else {
        return stripeService
          .createCustomer(userIdentity)
          .catch((error) => {
            logger.error('Failed to create stripe customer', {
              userId: userIdentity.userId,
              email: userIdentity.email,
              error
            });
            throw error;
          })
          .then((stripeCustomerId) =>
            userBaseStore
              .setStripeCustomerId(userIdentity.userId, stripeCustomerId)
              .catch((error) => {
                logger.error('Failed to save stripe customer ID to database', {
                  userId: userIdentity.userId,
                  stripeCustomerId,
                  error
                });
                throw error;
              })
              .then(() => stripeCustomerId)
          );
      }
    });
}

function checkEligibility(
  stripeCustomerId: StripeCustomerId,
  selectedProduct: Tier | Topup,
  stripeService: StripeService,
  userIdentity: UserIdentity<IdpName>
): Promise<{ eligible: boolean; stripeCustomerId: StripeCustomerId }> {
  if (selectedProduct.type === 'topup') {
    return Promise.resolve({ eligible: true, stripeCustomerId });
  }

  return stripeService.countSubscriptions(stripeCustomerId).then((activeSubscriptionCount) => {
    if (activeSubscriptionCount >= 1) {
      logger.info('Customer already has an active subscription', {
        userId: userIdentity.userId,
        stripeCustomerId,
        activeSubscriptionCount
      });
      return { eligible: false, stripeCustomerId };
    }
    return { eligible: true, stripeCustomerId };
  });
}

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _ctx: Context
): Promise<APIGatewayProxyResult> {
  const { userId, idp, idpId, email } = event.requestContext.authorizer.payload;
  const userIdentity = { userId, idp, idpId, email };
  const { stripeAuthConfig, stripeCheckoutConfig, paymentPlans, userBaseStoreConfig } =
    event.lambdaConfig;
  const apiKey = stripeAuthConfig.apiKey;
  const {
    successRedirectUrlPath,
    cancelSubscriptionRedirectUrlPath,
    cancelTopupRedirectUrlPath,
    taxId
  } = stripeCheckoutConfig;
  const { language } = event.body;

  const selectedProduct = match(event.body)
    .with({ tier: P.string }, ({ tier }) => paymentPlans.tiers[tier])
    .with({ topup: P.string }, ({ topup }) => paymentPlans.topups[topup])
    .exhaustive();

  const frontendUrl = validateRequestHeaderOrigin({
    headers: event.headers || {},
    lambdaConfig: event.lambdaConfig
  });
  if (!frontendUrl) {
    return corsErrorResponse;
  }
  const cancelRedirectUrlPath = match(selectedProduct.type)
    .with('tier', () => cancelSubscriptionRedirectUrlPath)
    .with('topup', () => cancelTopupRedirectUrlPath)
    .exhaustive();
  const successRedirectUrl = `${frontendUrl}${successRedirectUrlPath}` as Url;
  const cancelRedirectUrl = `${frontendUrl}${cancelRedirectUrlPath}` as Url;

  const dimensions: MetricDimensions = {
    tier: selectedProduct.id,
    userId: userId
  };
  const userBaseStore = UserBaseStore.withConfig(userBaseStoreConfig, logger);
  const stripeService = await StripeService.withConfig(apiKey);

  return createCustomerOrRetrieve(userIdentity, userBaseStore, stripeService)
    .then((stripeCustomerId) =>
      checkEligibility(stripeCustomerId, selectedProduct, stripeService, userIdentity)
    )
    .then((eligibilityResult) => {
      if (!eligibilityResult.eligible) {
        metrics.addMetric(
          'PaymentSessionBlockedDueToActiveSubscription',
          MetricUnit.Count,
          1,
          dimensions
        );
        return Promise.resolve(errorHandler(409)('Customer already has an active subscription'));
      }

      return stripeService
        .createCheckoutSession(
          eligibilityResult.stripeCustomerId,
          userIdentity,
          selectedProduct,
          language,
          successRedirectUrl,
          cancelRedirectUrl,
          taxId
        )
        .then(
          (sessionUrl) => {
            if (sessionUrl) {
              metrics.addMetric('PaymentSessionCreated', MetricUnit.Count, 1, dimensions);
              return successHandler()({ result: { url: sessionUrl } });
            } else {
              logger.error('No payment session was created for the user', { userId });
              metrics.addMetric('PaymentSessionCancelled', MetricUnit.Count, 1, dimensions);
              return errorHandler(500)(`No payment session was created for the user`);
            }
          },
          (error) => {
            logger.error('Failed to create stripe checkout session', {
              userId: userIdentity.userId,
              stripeCustomerId: eligibilityResult.stripeCustomerId,
              product: selectedProduct.id,
              error
            });
            metrics.addMetric('PaymentSessionFailed', MetricUnit.Count, 1, dimensions);
            return errorHandler(500)(`There was an error creating a payment session for the user`, {
              error
            });
          }
        );
    })
    .catch((error) => {
      metrics.addMetric('PaymentSessionFailed', MetricUnit.Count, 1, dimensions);
      return errorHandler(500)(`There was an error creating a payment session for the user`, {
        error
      });
    });
}

const handler = protectedEndpointMiddleware(
  readPostPaymentCheckoutSessionConfig,
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
