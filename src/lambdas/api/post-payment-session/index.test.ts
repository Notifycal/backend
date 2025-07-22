/* eslint-disable vitest/max-expects */
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { corsErrorResponse } from '@common/cors-middleware';
import { logger, metrics } from '@common/powertools';
import { accessTokenSchema } from '@model/Jwt';
import type { Email, IdpName, StripeCustomerId, UserId } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { UserBaseStore } from '@services/stores/user-base-store';
import { StripeService } from '@services/stripe';
import { testAuthedEvent } from '@testing/data/apigateway';
import { validPaymentPlans } from '@testing/data/pricing';
import { responseError, responseSuccess } from '@testing/utils/api-response-handlers';
import { assert } from '@testing/utils/assertions';
import {
  setEnvBaseConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvPaymentPlansConfig,
  setEnvStripeAuthConfig,
  setEnvStripeCheckoutConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { PostPaymentCheckoutSessionConfig } from './config';
import type { Event } from './schemas';
// @ts-expect-error cjs handler export
import { handler } from './index';

vi.mock('@services/stripe');
vi.mock('@services/stores/user-base-store');
vi.mock('@utils/MetricsAggregator', () => {
  class MockMetricsAggregator {
    public addMetric = vi.fn();
    public publishAll = vi.fn();
  }
  return {
    default: MockMetricsAggregator
  };
});

describe('POST Payment checkout session', () => {
  const validUserId = 'cfaa8471-f4cc-44da-bc22-ddc4b735a847' as UserId;
  const validEmail = 'test@notifycal.com' as Email;
  const validStripeCustomerId = 'cus_test_123456789' as StripeCustomerId;
  const validIdentity = {
    userId: validUserId,
    email: validEmail,
    idp: 'google.com',
    idpId: '246534735745767767'
  };
  const validAccessToken = {
    ...validIdentity,
    role: 'user',
    permissions: {}
  };

  const validTierRequestBody = {
    tier: 'good',
    language: 'es'
  };

  const validTopupRequestBody = {
    topup: 'single',
    language: 'en'
  };

  const validCheckoutUrl = 'https://checkout.stripe.com/pay/cs_test_123456789';

  describe('Tier products', () => {
    it('should create checkout session successfully with existing stripe customer for tier when no active subscriptions', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(0);
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseSuccess({ result: { url: validCheckoutUrl } }));

      expect(getStripeCustomerIdFn).toHaveBeenCalledTimes(1);
      expect(getStripeCustomerIdFn).toHaveBeenCalledWith(validUserId);
      expect(createCustomerFn).not.toHaveBeenCalled();
      expect(setStripeCustomerIdFn).not.toHaveBeenCalled();
      expect(countSubscriptionsFn).toHaveBeenCalledTimes(1);
      expect(countSubscriptionsFn).toHaveBeenCalledWith(validStripeCustomerId);
      expect(createCheckoutSessionFn).toHaveBeenCalledTimes(1);
      expect(createCheckoutSessionFn).toHaveBeenCalledWith(
        validStripeCustomerId,
        validIdentity,
        defaultConfig.paymentPlans.tiers.good,
        'es',
        `${defaultConfig.corsConfig.allowedOrigins[0]}/success`,
        `${defaultConfig.corsConfig.allowedOrigins[0]}/cancel-subscription`,
        defaultConfig.stripeCheckoutConfig.taxId
      );
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionCreated', MetricUnit.Count, 1, {
        tier: validTierRequestBody.tier,
        userId: validUserId
      });
    });

    it('should return 409 when customer already has an active subscription for tier', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(1);
      const loggerInfoFn = vi.spyOn(logger, 'info');
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseError(409));

      expect(getStripeCustomerIdFn).toHaveBeenCalledTimes(1);
      expect(countSubscriptionsFn).toHaveBeenCalledTimes(1);
      expect(countSubscriptionsFn).toHaveBeenCalledWith(validStripeCustomerId);
      expect(createCheckoutSessionFn).not.toHaveBeenCalled();
      expect(loggerInfoFn).toHaveBeenCalledWith('Customer already has an active subscription', {
        userId: validUserId,
        stripeCustomerId: validStripeCustomerId,
        activeSubscriptionCount: 1
      });
      expect(addMetricFn).toHaveBeenCalledWith(
        'PaymentSessionBlockedDueToActiveSubscription',
        MetricUnit.Count,
        1,
        {
          tier: validTierRequestBody.tier,
          userId: validUserId
        }
      );
    });

    it('should return 409 when customer has multiple active subscriptions for tier', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(3);
      const loggerInfoFn = vi.spyOn(logger, 'info');
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseError(409));

      expect(loggerInfoFn).toHaveBeenCalledWith('Customer already has an active subscription', {
        userId: validUserId,
        stripeCustomerId: validStripeCustomerId,
        activeSubscriptionCount: 3
      });
      expect(addMetricFn).toHaveBeenCalledWith(
        'PaymentSessionBlockedDueToActiveSubscription',
        MetricUnit.Count,
        1,
        {
          tier: validTierRequestBody.tier,
          userId: validUserId
        }
      );
    });

    it('should create checkout session successfully with new stripe customer for tier', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(0);
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseSuccess({ result: { url: validCheckoutUrl } }));

      expect(getStripeCustomerIdFn).toHaveBeenCalledTimes(1);
      expect(getStripeCustomerIdFn).toHaveBeenCalledWith(validUserId);
      expect(createCustomerFn).toHaveBeenCalledTimes(1);
      expect(createCustomerFn).toHaveBeenCalledWith(validIdentity);
      expect(setStripeCustomerIdFn).toHaveBeenCalledTimes(1);
      expect(setStripeCustomerIdFn).toHaveBeenCalledWith(validUserId, validStripeCustomerId);
      expect(countSubscriptionsFn).toHaveBeenCalledTimes(1);
      expect(createCheckoutSessionFn).toHaveBeenCalledTimes(1);
      expect(createCheckoutSessionFn).toHaveBeenCalledWith(
        validStripeCustomerId,
        validIdentity,
        defaultConfig.paymentPlans.tiers.good,
        'es',
        `${defaultConfig.corsConfig.allowedOrigins[0]}/success`,
        `${defaultConfig.corsConfig.allowedOrigins[0]}/cancel-subscription`,
        defaultConfig.stripeCheckoutConfig.taxId
      );
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionCreated', MetricUnit.Count, 1, {
        tier: validTierRequestBody.tier,
        userId: validUserId
      });
    });
  });

  describe('Topup products', () => {
    it('should create checkout session successfully for topup even with active subscriptions', async () => {
      const event = (await testAuthedEvent(
        validTopupRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(1);
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseSuccess({ result: { url: validCheckoutUrl } }));

      expect(getStripeCustomerIdFn).toHaveBeenCalledTimes(1);
      expect(getStripeCustomerIdFn).toHaveBeenCalledWith(validUserId);
      expect(createCustomerFn).not.toHaveBeenCalled();
      expect(setStripeCustomerIdFn).not.toHaveBeenCalled();
      expect(countSubscriptionsFn).not.toHaveBeenCalled();
      expect(createCheckoutSessionFn).toHaveBeenCalledTimes(1);
      expect(createCheckoutSessionFn).toHaveBeenCalledWith(
        validStripeCustomerId,
        validIdentity,
        defaultConfig.paymentPlans.topups.single,
        'en',
        `${defaultConfig.corsConfig.allowedOrigins[0]}/success`,
        `${defaultConfig.corsConfig.allowedOrigins[0]}/cancel-topup`,
        defaultConfig.stripeCheckoutConfig.taxId
      );
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionCreated', MetricUnit.Count, 1, {
        tier: validTopupRequestBody.topup,
        userId: validUserId
      });
    });

    it('should create checkout session successfully with new stripe customer for topup', async () => {
      const event = (await testAuthedEvent(
        validTopupRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(0);
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseSuccess({ result: { url: validCheckoutUrl } }));

      expect(getStripeCustomerIdFn).toHaveBeenCalledTimes(1);
      expect(getStripeCustomerIdFn).toHaveBeenCalledWith(validUserId);
      expect(createCustomerFn).toHaveBeenCalledTimes(1);
      expect(createCustomerFn).toHaveBeenCalledWith(validIdentity);
      expect(setStripeCustomerIdFn).toHaveBeenCalledTimes(1);
      expect(setStripeCustomerIdFn).toHaveBeenCalledWith(validUserId, validStripeCustomerId);
      expect(countSubscriptionsFn).not.toHaveBeenCalled();
      expect(createCheckoutSessionFn).toHaveBeenCalledTimes(1);
      expect(createCheckoutSessionFn).toHaveBeenCalledWith(
        validStripeCustomerId,
        validIdentity,
        defaultConfig.paymentPlans.topups.single,
        'en',
        `${defaultConfig.corsConfig.allowedOrigins[0]}/success`,
        `${defaultConfig.corsConfig.allowedOrigins[0]}/cancel-topup`,
        defaultConfig.stripeCheckoutConfig.taxId
      );
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionCreated', MetricUnit.Count, 1, {
        tier: validTopupRequestBody.topup,
        userId: validUserId
      });
    });
  });

  describe('Error scenarios', () => {
    it('should return failure response when checkout session returns null', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(null);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(0);
      const loggerErrorFn = vi.spyOn(logger, 'error');
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseError(500));

      expect(loggerErrorFn).toHaveBeenCalledWith('No payment session was created for the user', {
        userId: validUserId
      });
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionCancelled', MetricUnit.Count, 1, {
        tier: validTierRequestBody.tier,
        userId: validUserId
      });
    });

    it('should return failure response when checkout session returns undefined', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(undefined);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(0);
      const loggerErrorFn = vi.spyOn(logger, 'error');
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseError(500));

      expect(loggerErrorFn).toHaveBeenCalledWith('No payment session was created for the user', {
        userId: validUserId
      });
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionCancelled', MetricUnit.Count, 1, {
        tier: validTierRequestBody.tier,
        userId: validUserId
      });
    });

    it('should handle count active subscriptions error and return failure response', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const invalidStripeError = new Error('Failed to count subscriptions');
      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
      const countSubscriptionsFn = vi.fn().mockRejectedValue(invalidStripeError);
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseError(500));

      expect(countSubscriptionsFn).toHaveBeenCalledTimes(1);
      expect(createCheckoutSessionFn).not.toHaveBeenCalled();
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionFailed', MetricUnit.Count, 1, {
        tier: validTierRequestBody.tier,
        userId: validUserId
      });
    });

    it('should handle get stripe customer id error and return failure response', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const invalidDbError = new Error('Database error');
      const getStripeCustomerIdFn = vi.fn().mockRejectedValue(invalidDbError);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(0);
      const loggerErrorFn = vi.spyOn(logger, 'error');
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseError(500));

      expect(loggerErrorFn).toHaveBeenCalledWith('Failed to get stripe customer ID from database', {
        userId: validUserId,
        error: invalidDbError
      });
      expect(createCustomerFn).not.toHaveBeenCalled();
      expect(createCheckoutSessionFn).not.toHaveBeenCalled();
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionFailed', MetricUnit.Count, 1, {
        tier: validTierRequestBody.tier,
        userId: validUserId
      });
    });

    it('should handle create customer error and return failure response', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const invalidStripeError = new Error('Stripe customer creation error');
      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockRejectedValue(invalidStripeError);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(0);
      const loggerErrorFn = vi.spyOn(logger, 'error');
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseError(500));

      expect(loggerErrorFn).toHaveBeenCalledWith('Failed to create stripe customer', {
        userId: validUserId,
        email: validEmail,
        error: invalidStripeError
      });
      expect(getStripeCustomerIdFn).toHaveBeenCalledTimes(1);
      expect(createCustomerFn).toHaveBeenCalledTimes(1);
      expect(setStripeCustomerIdFn).not.toHaveBeenCalled();
      expect(createCheckoutSessionFn).not.toHaveBeenCalled();
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionFailed', MetricUnit.Count, 1, {
        tier: validTierRequestBody.tier,
        userId: validUserId
      });
    });

    it('should handle set stripe customer id error and return failure response', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const invalidDbError = new Error('Database save error');
      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const setStripeCustomerIdFn = vi.fn().mockRejectedValue(invalidDbError);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(0);
      const loggerErrorFn = vi.spyOn(logger, 'error');
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseError(500));

      expect(loggerErrorFn).toHaveBeenCalledWith('Failed to save stripe customer ID to database', {
        userId: validUserId,
        stripeCustomerId: validStripeCustomerId,
        error: invalidDbError
      });
      expect(getStripeCustomerIdFn).toHaveBeenCalledTimes(1);
      expect(createCustomerFn).toHaveBeenCalledTimes(1);
      expect(setStripeCustomerIdFn).toHaveBeenCalledTimes(1);
      expect(createCheckoutSessionFn).not.toHaveBeenCalled();
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionFailed', MetricUnit.Count, 1, {
        tier: validTierRequestBody.tier,
        userId: validUserId
      });
    });

    it('should handle create checkout session error and return failure response', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {},
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const invalidStripeError = new Error('Stripe checkout session error');
      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockRejectedValue(invalidStripeError);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(0);
      const loggerErrorFn = vi.spyOn(logger, 'error');
      const addMetricFn = vi.spyOn(metrics, 'addMetric');

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, responseError(500));

      expect(loggerErrorFn).toHaveBeenCalledWith('Failed to create stripe checkout session', {
        userId: validUserId,
        stripeCustomerId: validStripeCustomerId,
        product: validTierRequestBody.tier,
        error: invalidStripeError
      });
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionFailed', MetricUnit.Count, 1, {
        tier: validTierRequestBody.tier,
        userId: validUserId
      });
    });

    it('should return a cors error if frontend domain cannot be trusted', async () => {
      const event = (await testAuthedEvent(
        validTierRequestBody,
        {
          Origin: 'http://maliciousDommain:8080'
        },
        accessTokenSchema,
        validAccessToken
      )) as unknown as APIGatewayProxyEvent;

      const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const setStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const createCustomerFn = vi.fn().mockResolvedValue(validStripeCustomerId);
      const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
      const countSubscriptionsFn = vi.fn().mockResolvedValue(0);

      const resp = await testIt(
        event,
        getStripeCustomerIdFn,
        setStripeCustomerIdFn,
        createCustomerFn,
        createCheckoutSessionFn,
        countSubscriptionsFn
      );

      assert(resp, corsErrorResponse);

      expect(getStripeCustomerIdFn).not.toHaveBeenCalled();
      expect(createCustomerFn).not.toHaveBeenCalled();
      expect(createCheckoutSessionFn).not.toHaveBeenCalled();
    });
  });

  function testIt(
    event: APIGatewayProxyEvent,
    getStripeCustomerIdFn: () => Promise<StripeCustomerId | undefined>,
    setStripeCustomerIdFn: () => Promise<void>,
    createCustomerFn: () => Promise<StripeCustomerId>,
    createCheckoutSessionFn: () => Promise<Url | null>,
    countSubscriptionsFn: () => Promise<number>,
    config: PostPaymentCheckoutSessionConfig = defaultConfig
  ): Promise<APIGatewayProxyResult> {
    setEnv(config);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(UserBaseStore.withConfig).mockReturnValue({
      getStripeCustomerId: getStripeCustomerIdFn,
      setStripeCustomerId: setStripeCustomerIdFn
    } as unknown as UserBaseStore<IdpName>);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(StripeService.withConfig).mockResolvedValue({
      createCustomer: createCustomerFn,
      createCheckoutSession: createCheckoutSessionFn,
      countSubscriptions: countSubscriptionsFn
    } as unknown as StripeService);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return handler(event as unknown as Event, {} as Context);
  }
});

const defaultConfig: PostPaymentCheckoutSessionConfig = {
  decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
  corsConfig: {
    allowedOrigins: ['http://localhost:5173']
  },
  stripeAuthConfig: {
    apiKey: 'sk_test_123456789'
  },
  stripeCheckoutConfig: {
    successRedirectUrlPath: '/success' as Url,
    cancelSubscriptionRedirectUrlPath: '/cancel-subscription' as Url,
    cancelTopupRedirectUrlPath: '/cancel-topup' as Url,
    taxId: 'tx_dtftbhetrhgertgh'
  },
  paymentPlans: validPaymentPlans,
  userBaseStoreConfig: {
    tableName: 'Users-local'
  }
};

function setEnv(config: PostPaymentCheckoutSessionConfig) {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
  setEnvBaseConfig(config.corsConfig);
  setEnvStripeAuthConfig(config.stripeAuthConfig);
  setEnvStripeCheckoutConfig(config.stripeCheckoutConfig);
  setEnvPaymentPlansConfig(config.paymentPlans);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
}
