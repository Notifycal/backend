import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { corsErrorResponse } from '@common/cors-middleware';
import { logger, metrics } from '@common/powertools';
import { accessTokenSchema } from '@model/Jwt';
import type { Email, UserId } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
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
  setEnvStripeCheckoutConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { PostPaymentCheckoutSessionConfig } from './config';
import type { Event } from './schemas';
// @ts-expect-error cjs handler export
import { handler } from './index';

vi.mock('@services/stripe');
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

  const validRequestBody = {
    tier: 'good',
    language: 'es'
  };

  const validCheckoutUrl = 'https://checkout.stripe.com/pay/cs_test_123456789';

  it('should create checkout session successfully', async () => {
    const event = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;

    const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);
    const addMetricFn = vi.spyOn(metrics, 'addMetric');

    return testIt(event, createCheckoutSessionFn).then((resp) => {
      assert(resp, responseSuccess({ result: { url: validCheckoutUrl } }));

      expect(createCheckoutSessionFn).toHaveBeenCalledTimes(1);
      expect(createCheckoutSessionFn).toHaveBeenCalledWith(
        validIdentity,
        defaultConfig.paymentPlans.tiers.good,
        'es',
        `${defaultConfig.corsConfig.allowedOrigins[0]}/success`,
        `${defaultConfig.corsConfig.allowedOrigins[0]}/cancel`
      );
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionCreated', MetricUnit.Count, 1, {
        tier: validRequestBody.tier,
        userId: validUserId
      });
    });
  });

  it('should return failure response when checkout session returns null', async () => {
    const event = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;

    const createCheckoutSessionFn = vi.fn().mockResolvedValue(null);
    const loggerErrorFn = vi.spyOn(logger, 'error');
    const addMetricFn = vi.spyOn(metrics, 'addMetric');

    return testIt(event, createCheckoutSessionFn).then((resp) => {
      assert(resp, responseError(500));

      expect(loggerErrorFn).toHaveBeenCalledWith('No payment session was created for the user');
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionCancelled', MetricUnit.Count, 1, {
        tier: validRequestBody.tier,
        userId: validUserId
      });
    });
  });

  it('should return failure response when checkout session returns undefined', async () => {
    const event = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;

    const createCheckoutSessionFn = vi.fn().mockResolvedValue(undefined);
    const loggerErrorFn = vi.spyOn(logger, 'error');
    const addMetricFn = vi.spyOn(metrics, 'addMetric');

    return testIt(event, createCheckoutSessionFn).then((resp) => {
      assert(resp, responseError(500));

      expect(loggerErrorFn).toHaveBeenCalledWith('No payment session was created for the user');
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionCancelled', MetricUnit.Count, 1, {
        tier: validRequestBody.tier,
        userId: validUserId
      });
    });
  });

  it('should handle stripe service error and return failure response', async () => {
    const event = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;

    const stripeError = new Error('Stripe API error');
    const createCheckoutSessionFn = vi.fn().mockRejectedValue(stripeError);
    const loggerErrorFn = vi.spyOn(logger, 'error');
    const addMetricFn = vi.spyOn(metrics, 'addMetric');

    return testIt(event, createCheckoutSessionFn).then((resp) => {
      assert(resp, responseError(500));

      expect(loggerErrorFn).toHaveBeenCalledWith(
        'There was an error creating a payment session for the user',
        { error: stripeError }
      );
      expect(addMetricFn).toHaveBeenCalledWith('PaymentSessionFailed', MetricUnit.Count, 1, {
        tier: validRequestBody.tier,
        userId: validUserId
      });
    });
  });

  it('should return a cors error if frontend domain cannot be trusted', async () => {
    const event = (await testAuthedEvent(
      validRequestBody,
      {
        Origin: 'http://maliciousDommain:8080'
      },
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;

    const createCheckoutSessionFn = vi.fn().mockResolvedValue(validCheckoutUrl);

    return testIt(event, createCheckoutSessionFn).then((resp) => {
      assert(resp, corsErrorResponse);

      expect(createCheckoutSessionFn).toHaveBeenCalledTimes(0);
    });
  });
});

function testIt(
  event: APIGatewayProxyEvent,
  createCheckoutSessionFn: () => Promise<Url | null>,
  config: PostPaymentCheckoutSessionConfig = defaultConfig
): Promise<APIGatewayProxyResult> {
  setEnv(config);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(StripeService.prototype.createCheckoutSession).mockImplementation(
    createCheckoutSessionFn
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return handler(event as unknown as Event, {} as Context);
}

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
    cancelRedirectUrlPath: '/cancel' as Url,
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
}
