import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { corsErrorResponse } from '@common/cors-middleware';
import { metrics } from '@common/powertools';
import { accessTokenSchema, type OurAccessTokenClaims } from '@model/Jwt';
import type { Email, IdpId, IdpName, UserId } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { UserBaseStore } from '@services/stores/user-base-store';
import { StripeService } from '@services/stripe';
import { testAuthedEvent } from '@testing/data/apigateway';
import { responseSuccess } from '@testing/utils/api-response-handlers';
import { assert } from '@testing/utils/assertions';
import {
  setEnvBaseConfig,
  setEnvCustomerPortalConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvStripeAuthConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { PostCustomerPortalSessionConfig } from './config';
// @ts-expect-error cjs handler export
import { handler } from './index';

vi.mock('@common/powertools');
vi.mock('@services/stores/user-base-store');
vi.mock('@services/stripe');

const validStripeCustomerPortalConfigId = 'cng_rdtsghethergwrg';

describe('Customer Portal Session Handler', () => {
  const validUserId = 'cfaa8471-f4cc-44da-bc22-ddc4b735a847' as UserId;
  const validStripeCustomerId = 'cus_123';
  const validSessionUrl = 'https://billing.stripe.com/session/123' as Url;
  const validReturnUrl = 'http://localhost:5173/#/somepath' as Url;

  const validIdentity = {
    userId: validUserId,
    email: 'test@notifycal.com' as Email,
    idp: 'google.com' as IdpName,
    idpId: '246534735745767767' as IdpId
  };
  const validAccessToken: OurAccessTokenClaims = {
    ...validIdentity,
    role: 'user',
    permissions: {}
  };
  const validRequestBody = {};
  const validRequestBodyWithFlowType = { flowType: 'subscription_update' };
  const validRequestBodyWithCancelFlow = { flowType: 'subscription_cancel' };

  async function testCustomerPortalSession(
    requestBody: object,
    expectedFlowType: 'subscription_cancel' | 'subscription_update' | undefined
  ) {
    const validEvent = (await testAuthedEvent(
      requestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;

    const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
    const createCustomerPortalSessionFn = vi.fn().mockResolvedValue(validSessionUrl);
    const addMetricFn = vi.fn();

    const result = await testIt(
      validEvent,
      getStripeCustomerIdFn,
      createCustomerPortalSessionFn,
      addMetricFn
    );

    expect(getStripeCustomerIdFn).toHaveBeenCalledWith(validUserId);
    expect(createCustomerPortalSessionFn).toHaveBeenCalledWith(
      validStripeCustomerId,
      validReturnUrl,
      validStripeCustomerPortalConfigId,
      expectedFlowType
    );
    expect(addMetricFn).toHaveBeenCalledWith('CustomerPortalSessionCreated', MetricUnit.Count, 1, {
      userId: validUserId
    });
    expect(result.statusCode).toBe(200);

    assert(result, responseSuccess({ result: { url: validSessionUrl } }));
  }

  // eslint-disable-next-line vitest/expect-expect
  it('should create customer portal session successfully', async () => {
    await testCustomerPortalSession(validRequestBody, undefined);
  });

  it('should return CORS error when frontend URL validation fails', async () => {
    const invalidEvent = (await testAuthedEvent(
      validRequestBody,
      {
        Origin: 'https://malicious-site.com'
      },
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;

    const getStripeCustomerIdFn = vi.fn();
    const createCustomerPortalSessionFn = vi.fn();
    const addMetricFn = vi.fn();

    const result = await testIt(
      invalidEvent,
      getStripeCustomerIdFn,
      createCustomerPortalSessionFn,
      addMetricFn
    );

    expect(getStripeCustomerIdFn).not.toHaveBeenCalled();
    expect(createCustomerPortalSessionFn).not.toHaveBeenCalled();
    expect(result).toBe(corsErrorResponse);
  });

  it('should return error when user has no stripe customer ID', async () => {
    const validEvent = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;

    const getStripeCustomerIdFn = vi.fn().mockResolvedValue(null);
    const createCustomerPortalSessionFn = vi.fn();
    const addMetricFn = vi.fn();

    const result = await testIt(
      validEvent,
      getStripeCustomerIdFn,
      createCustomerPortalSessionFn,
      addMetricFn
    );

    expect(getStripeCustomerIdFn).toHaveBeenCalledWith(validUserId);
    expect(createCustomerPortalSessionFn).not.toHaveBeenCalled();
    expect(addMetricFn).toHaveBeenCalledWith(
      'CustomerPortalSessionNoCustomer',
      MetricUnit.Count,
      1,
      {
        userId: validUserId
      }
    );
    expect(result.statusCode).toBe(500);
  });

  it('should return error when stripe service returns null session URL', async () => {
    const validEvent = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;

    const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
    const createCustomerPortalSessionFn = vi.fn().mockResolvedValue(null);
    const addMetricFn = vi.fn();

    const result = await testIt(
      validEvent,
      getStripeCustomerIdFn,
      createCustomerPortalSessionFn,
      addMetricFn
    );

    expect(createCustomerPortalSessionFn).toHaveBeenCalledWith(
      validStripeCustomerId,
      validReturnUrl,
      validStripeCustomerPortalConfigId,
      undefined
    );
    expect(addMetricFn).toHaveBeenCalledWith(
      'CustomerPortalSessionCancelled',
      MetricUnit.Count,
      1,
      {
        userId: validUserId
      }
    );
    expect(result.statusCode).toBe(500);
  });

  it('should handle stripe service error', async () => {
    const validEvent = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;

    const validError = new Error('Stripe API error');
    const getStripeCustomerIdFn = vi.fn().mockResolvedValue(validStripeCustomerId);
    const createCustomerPortalSessionFn = vi.fn().mockRejectedValue(validError);
    const addMetricFn = vi.fn();

    const result = await testIt(
      validEvent,
      getStripeCustomerIdFn,
      createCustomerPortalSessionFn,
      addMetricFn
    );

    expect(createCustomerPortalSessionFn).toHaveBeenCalledWith(
      validStripeCustomerId,
      validReturnUrl,
      validStripeCustomerPortalConfigId,
      undefined
    );
    expect(addMetricFn).toHaveBeenCalledWith('CustomerPortalSessionFailed', MetricUnit.Count, 1, {
      userId: validUserId
    });
    expect(result.statusCode).toBe(500);
  });

  it('should handle user base store error', async () => {
    const validEvent = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;

    const validError = new Error('Database error');
    const getStripeCustomerIdFn = vi.fn().mockRejectedValue(validError);
    const createCustomerPortalSessionFn = vi.fn();
    const addMetricFn = vi.fn();

    await expect(
      testIt(validEvent, getStripeCustomerIdFn, createCustomerPortalSessionFn, addMetricFn)
    ).rejects.toThrow(validError);

    expect(getStripeCustomerIdFn).toHaveBeenCalledWith(validUserId);
    expect(createCustomerPortalSessionFn).not.toHaveBeenCalled();
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should create customer portal session with subscription_update flow_type', async () => {
    await testCustomerPortalSession(
      validRequestBodyWithFlowType,
      'subscription_update'
    );
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should create customer portal session with subscription_cancel flow_type', async () => {
    await testCustomerPortalSession(
      validRequestBodyWithCancelFlow,
      'subscription_cancel'
    );
  });
});

const defaultConfig: PostCustomerPortalSessionConfig = {
  decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
  corsConfig: {
    allowedOrigins: ['http://localhost:5173']
  },
  stripeAuthConfig: {
    apiKey: 'sk_test_123456789'
  },
  userBaseStoreConfig: {
    tableName: 'Users-local'
  },
  stripeCustomerPortalConfig: {
    returnUrlPath: '/#/somepath' as Url,
    configId: validStripeCustomerPortalConfigId
  }
};

function setEnv(config: PostCustomerPortalSessionConfig): void {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
  setEnvBaseConfig(config.corsConfig);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvStripeAuthConfig(config.stripeAuthConfig);
  setEnvCustomerPortalConfig(config.stripeCustomerPortalConfig);
}

function testIt(
  event: APIGatewayProxyEvent,
  getStripeCustomerIdFn: () => Promise<string | null>,
  createCustomerPortalSessionFn: (
    stripeCustomerId: string,
    returnUrl: string,
    configId: string,
    flowType?: 'subscription_cancel' | 'subscription_update'
  ) => Promise<string | null>,
  addMetricFn: () => void,
  config: PostCustomerPortalSessionConfig = defaultConfig
): Promise<APIGatewayProxyResult> {
  setEnv(config);

  const userBaseStoreMock = {
    getStripeCustomerId: getStripeCustomerIdFn
  } as unknown as UserBaseStore<IdpName>;

  const stripeServiceMock = {
    createCustomerPortalSession: createCustomerPortalSessionFn
  } as unknown as StripeService;

  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(UserBaseStore.withConfig).mockReturnValue(userBaseStoreMock);

  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(StripeService.withConfig).mockResolvedValue(stripeServiceMock);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(metrics.addMetric).mockImplementation(addMetricFn);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return handler(event, {} as Context);
}
