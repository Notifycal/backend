/* eslint-disable camelcase */
import { logger } from '@common/powertools';
import type { Tier, Topup } from '@model/PaymentPlans';
import type {
  Email,
  IdpId,
  IdpName,
  LanguageCode,
  StripeCustomerId,
  UserId,
  UserIdentity
} from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { HttpClient } from '@services/common/http-client';
import type { AxiosInstance } from 'axios';
import { Stripe } from 'stripe';
import { describe, expect, it, vi, type MockInstance } from 'vitest';
import { StripeService } from './stripe';

vi.mock('stripe');
vi.mock('@common/powertools', () => ({
  logger: {
    info: vi.fn()
  }
}));
vi.mock('@services/common/http-client');
vi.mock('./stripe-axios-client');

const validApiKey = 'sk_test_123456789';

describe(StripeService, () => {
  const validUserId = 'cfaa8471-f4cc-44da-bc22-ddc4b735a847' as UserId;
  const validEmail = 'test@notifycal.com' as Email;
  const validIdentity: UserIdentity<'google.com'> = {
    userId: validUserId,
    idp: 'google.com',
    idpId: '1234567890' as IdpId,
    email: validEmail
  };
  const validLanguage = 'en' as LanguageCode;
  const validSuccessUrl = 'https://example.com/success' as Url;
  const validCancelUrl = 'https://example.com/cancel' as Url;
  const validReturnUrl = 'https://example.com/return' as Url;
  const validTier: Tier = {
    type: 'tier',
    id: 'good',
    priceId: 'price_123456789',
    credits: 100
  };
  const validCheckoutUrl = 'https://checkout.stripe.com/pay/cs_test_123456789';
  const validPortalUrl = 'https://billing.stripe.com/session/ps_test_123456789';
  const validStripeCustomerId = 'cus_123456789' as StripeCustomerId;
  const validTaxId = 'tax_rate_123';

  const testClocksMockFn = (
    listFn: MockInstance = vi.fn().mockRejectedValue(new Error('Testing in anger')),
    createFn: MockInstance = vi.fn().mockRejectedValue(new Error('Testing in anger'))
  ) =>
    ({
      testHelpers: {
        testClocks: {
          list: listFn,
          create: createFn
        }
      }
    }) as unknown as Stripe;

  it('should initialize Stripe client with correct API key and version', async () => {
    const mockConstructor = vi.fn(() => testClocksMockFn());
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(HttpClient.prototype.getAxiosInstance).mockResolvedValue({} as AxiosInstance);
    vi.mocked(Stripe).mockImplementation(mockConstructor);

    await StripeService.withConfig(validApiKey);

    expect(HttpClient).toHaveBeenCalledWith(undefined, undefined, 'Stripe');
    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(mockConstructor).toHaveBeenCalledWith(validApiKey, {
      apiVersion: '2025-06-30.basil',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      httpClient: expect.any(Object)
    });
  });

  describe('createCustomer', () => {
    it('should create customer successfully and return customer ID', async () => {
      const createCustomerFn = vi.fn().mockResolvedValue({ id: validStripeCustomerId });

      const result = await testCreateCustomer(validIdentity, createCustomerFn);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.info).toHaveBeenCalledWith('Creating customer in Stripe for user identity', {
        userIdentity: validIdentity
      });
      expect(result).toBe(validStripeCustomerId);
      expect(createCustomerFn).toHaveBeenCalledTimes(1);
      expect(createCustomerFn).toHaveBeenCalledWith({
        email: validEmail,
        metadata: {
          userId: validUserId,
          idp: 'google.com',
          idpId: '1234567890',
          email: validEmail
        }
      });
    });

    it('should throw error when Stripe API fails', async () => {
      const stripeError = new Error('Customer creation failed');
      const createCustomerFn = vi.fn().mockRejectedValue(stripeError);

      await expect(testCreateCustomer(validIdentity, createCustomerFn)).rejects.toThrow(
        'Customer creation failed'
      );
    });

    const testClock: Stripe.TestHelpers.TestClock = {
      id: '',
      livemode: true,
      object: 'test_helpers.test_clock',
      created: 0,
      deletes_after: 0,
      frozen_time: 0,
      name: null,
      status: 'ready',
      status_details: {}
    };

    const testCases1 = [
      { description: 'empty array', implementation: () => Promise.resolve({ data: [] }) },
      {
        description: 'test clocks with livemode=true flag (but API call succeeds)',
        implementation: () => Promise.resolve({ data: [testClock] })
      },
      {
        description: 'single test clock',
        implementation: () => Promise.resolve({ data: [{ id: 'test_clock_1' }] })
      },
      {
        description: 'multiple test clocks',
        implementation: () =>
          Promise.resolve({ data: [{ id: 'test_clock_1' }, { id: 'test_clock_2' }] })
      },
      { description: 'null data', implementation: () => Promise.resolve({ data: null }) },
      { description: 'undefined data', implementation: () => Promise.resolve({ data: undefined }) },
      {
        description: 'empty object',
        implementation: () => Promise.resolve({})
      }
    ];

    // eslint-disable-next-line vitest/require-hook
    testCases1.forEach(({ description, implementation }) => {
      it(`should call createTestClock when listTestClock API call succeeds with ${description} (indicating test mode)`, async () => {
        const listTestClockFn = vi.fn().mockImplementation(implementation);
        const createTestClockFn = vi.fn().mockResolvedValue({ id: 'clock_123' });
        const createCustomerFn = vi.fn().mockResolvedValue({ id: validStripeCustomerId });

        await testCreateCustomer(
          validIdentity,
          createCustomerFn,
          listTestClockFn,
          createTestClockFn
        );

        expect(listTestClockFn).toHaveBeenCalledTimes(1);
        expect(listTestClockFn).toHaveBeenCalledWith({ limit: 1 });
        expect(createTestClockFn).toHaveBeenCalledTimes(1);
        expect(createTestClockFn).toHaveBeenCalledWith({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          frozen_time: expect.any(Number),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          name: expect.stringContaining(validIdentity.email)
        });
        expect(createCustomerFn).toHaveBeenCalledTimes(1);
        // eslint-disable-next-line vitest/max-expects
        expect(createCustomerFn).toHaveBeenCalledWith(
          expect.objectContaining({
            email: validIdentity.email,
            metadata: {
              userId: validIdentity.userId,
              idp: validIdentity.idp,
              idpId: validIdentity.idpId,
              email: validIdentity.email
            },
            test_clock: 'clock_123'
          })
        );
      });
    });

    const testCases2 = [
      {
        description: 'API error (likely production environment)',
        implementation: () => Promise.reject(new Error('Stripe API error'))
      },
      {
        description: 'network timeout',
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        implementation: () => Promise.reject('Network timeout')
      },
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      { description: 'undefined error', implementation: () => Promise.reject(undefined) },
      {
        description: 'permission error (typical in production)',
        implementation: () => Promise.reject(new Error('Insufficient permissions for test clocks'))
      }
    ];

    // eslint-disable-next-line vitest/require-hook
    testCases2.forEach(({ description, implementation }) => {
      it(`should not call createTestClock when listTestClock API call fails with ${description} (indicating live mode)`, async () => {
        const listTestClockFn = vi.fn().mockImplementation(implementation);
        const createTestClockFn = vi.fn();
        const createCustomerFn = vi.fn().mockResolvedValue({ id: validStripeCustomerId });

        await testCreateCustomer(
          validIdentity,
          createCustomerFn,
          listTestClockFn,
          createTestClockFn
        );

        expect(listTestClockFn).toHaveBeenCalledTimes(1);
        expect(listTestClockFn).toHaveBeenCalledWith({ limit: 1 });
        expect(createTestClockFn).not.toHaveBeenCalled();
        expect(createCustomerFn).toHaveBeenCalledTimes(1);
        expect(createCustomerFn).toHaveBeenCalledWith(
          expect.objectContaining({
            email: validIdentity.email,
            metadata: {
              userId: validIdentity.userId,
              idp: validIdentity.idp,
              idpId: validIdentity.idpId,
              email: validIdentity.email
            }
          })
        );
        // eslint-disable-next-line vitest/max-expects
        expect(createCustomerFn).toHaveBeenCalledWith(
          expect.not.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            test_clock: expect.any(String)
          })
        );
      });
    });
  });

  describe('createCheckoutSession', () => {
    const validTopup: Topup = {
      type: 'topup',
      id: 'single',
      priceId: 'price_topup_123',
      credits: 100
    };

    it('should create tier checkout session successfully and return session URL', async () => {
      const mockSession = { url: validCheckoutUrl };
      const createSessionFn = vi.fn().mockResolvedValue(mockSession);

      const result = await testCheckoutSession(
        validStripeCustomerId,
        validIdentity,
        validTier,
        validLanguage,
        validSuccessUrl,
        validCancelUrl,
        createSessionFn
      );

      expect(result).toBe(validCheckoutUrl);
      expect(createSessionFn).toHaveBeenCalledTimes(1);
      expect(createSessionFn).toHaveBeenCalledWith({
        mode: 'subscription',
        ui_mode: 'hosted',
        payment_method_types: ['card'],
        customer: validStripeCustomerId,
        customer_update: {
          name: 'auto',
          address: 'auto'
        },
        client_reference_id: validUserId,
        success_url: validSuccessUrl,
        cancel_url: validCancelUrl,
        locale: validLanguage,
        line_items: [
          {
            price: validTier.priceId,
            quantity: 1,
            tax_rates: [validTaxId]
          }
        ],
        metadata: {
          userId: validUserId,
          idp: 'google.com',
          idpId: '1234567890',
          email: validEmail,
          product: validTier.id,
          vatCountry: 'ES'
        },
        automatic_tax: { enabled: false },
        billing_address_collection: 'required',
        tax_id_collection: {
          enabled: true
        }
      });
    });

    it('should create topup checkout session successfully and return session URL', async () => {
      const mockSession = { url: validCheckoutUrl };
      const createSessionFn = vi.fn().mockResolvedValue(mockSession);

      const result = await testCheckoutSession(
        validStripeCustomerId,
        validIdentity,
        validTopup,
        validLanguage,
        validSuccessUrl,
        validCancelUrl,
        createSessionFn
      );

      expect(result).toBe(validCheckoutUrl);
      expect(createSessionFn).toHaveBeenCalledTimes(1);
      expect(createSessionFn).toHaveBeenCalledWith({
        mode: 'payment',
        invoice_creation: {
          enabled: true
        },
        ui_mode: 'hosted',
        payment_method_types: ['card'],
        customer: validStripeCustomerId,
        customer_update: {
          name: 'auto',
          address: 'auto'
        },
        client_reference_id: validUserId,
        success_url: validSuccessUrl,
        cancel_url: validCancelUrl,
        locale: validLanguage,
        line_items: [
          {
            price: validTopup.priceId,
            quantity: 1,
            tax_rates: [validTaxId],
            adjustable_quantity: {
              enabled: true,
              minimum: 1,
              maximum: 99
            }
          }
        ],
        metadata: {
          userId: validUserId,
          idp: 'google.com',
          idpId: '1234567890',
          email: validEmail,
          product: validTopup.id,
          vatCountry: 'ES'
        },
        automatic_tax: { enabled: false },
        billing_address_collection: 'required',
        tax_id_collection: {
          enabled: true
        }
      });
    });

    it('should return null when session URL is null', async () => {
      const mockSession = { url: null };
      const createSessionFn = vi.fn().mockResolvedValue(mockSession);

      const result = await testCheckoutSession(
        validStripeCustomerId,
        validIdentity,
        validTier,
        validLanguage,
        validSuccessUrl,
        validCancelUrl,
        createSessionFn
      );

      expect(result).toBeNull();
    });

    it('should handle different language codes correctly', async () => {
      const spanishLanguage = 'es' as LanguageCode;
      const mockSession = { url: validCheckoutUrl };
      const createSessionFn = vi.fn().mockResolvedValue(mockSession);

      await testCheckoutSession(
        validStripeCustomerId,
        validIdentity,
        validTier,
        spanishLanguage,
        validSuccessUrl,
        validCancelUrl,
        createSessionFn
      );

      expect(createSessionFn).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: spanishLanguage
        })
      );
    });

    it('should handle different tier configurations correctly', async () => {
      const betterTier: Tier = {
        type: 'tier',
        id: 'better',
        priceId: 'price_better_123',
        credits: 500
      };
      const mockSession = { url: validCheckoutUrl };
      const createSessionFn = vi.fn().mockResolvedValue(mockSession);

      await testCheckoutSession(
        validStripeCustomerId,
        validIdentity,
        betterTier,
        validLanguage,
        validSuccessUrl,
        validCancelUrl,
        createSessionFn
      );

      expect(createSessionFn).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          line_items: [
            {
              price: betterTier.priceId,
              quantity: 1,
              tax_rates: [validTaxId]
            }
          ],
          metadata: expect.objectContaining({
            product: betterTier.id
          }) as Record<string, string>
        })
      );
    });

    it('should handle different topup configurations correctly', async () => {
      const largerTopup: Topup = {
        type: 'topup',
        id: 'single',
        priceId: 'price_topup_500',
        credits: 500
      };
      const mockSession = { url: validCheckoutUrl };
      const createSessionFn = vi.fn().mockResolvedValue(mockSession);

      await testCheckoutSession(
        validStripeCustomerId,
        validIdentity,
        largerTopup,
        validLanguage,
        validSuccessUrl,
        validCancelUrl,
        createSessionFn
      );

      expect(createSessionFn).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          invoice_creation: {
            enabled: true
          },
          line_items: [
            {
              price: largerTopup.priceId,
              quantity: 1,
              tax_rates: [validTaxId],
              adjustable_quantity: {
                enabled: true,
                minimum: 1,
                maximum: 99
              }
            }
          ],
          metadata: expect.objectContaining({
            product: largerTopup.id
          }) as Record<string, string>
        })
      );
    });

    it('should throw error when Stripe API fails', async () => {
      const stripeError = new Error('Stripe API error');
      const createSessionFn = vi.fn().mockRejectedValue(stripeError);

      await expect(
        testCheckoutSession(
          validStripeCustomerId,
          validIdentity,
          validTier,
          validLanguage,
          validSuccessUrl,
          validCancelUrl,
          createSessionFn
        )
      ).rejects.toThrow('Stripe API error');
    });

    it('should include all required fields in checkout session', async () => {
      const mockSession = { url: validCheckoutUrl };
      const createSessionFn = vi.fn().mockResolvedValue(mockSession);

      await testCheckoutSession(
        validStripeCustomerId,
        validIdentity,
        validTier,
        validLanguage,
        validSuccessUrl,
        validCancelUrl,
        createSessionFn
      );

      expect(createSessionFn).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: validStripeCustomerId,
          customer_update: {
            name: 'auto',
            address: 'auto'
          },
          client_reference_id: validUserId,
          metadata: {
            userId: validUserId,
            idp: 'google.com',
            idpId: '1234567890',
            email: validEmail,
            product: validTier.id,
            vatCountry: 'ES'
          },
          automatic_tax: { enabled: false },
          billing_address_collection: 'required',
          tax_id_collection: {
            enabled: true
          }
        })
      );
    });
  });

  describe('createCustomerPortalSession', () => {
    const validStripeCustomerPortalConfigId = 'cng_rdtsghethergwrg';

    type FlowType = 'subscription_cancel' | 'subscription_update' | 'payment_method_update';

    async function testPortalSession(
      flowType: FlowType,
      subscriptionsData: Array<{ id: string; status: string }> = [],
      expectedFlowData?: { type: FlowType; subscription: string }
    ) {
      const mockSession = { url: validPortalUrl };
      const createPortalSessionFn = vi.fn().mockResolvedValue(mockSession);
      const listSubscriptionsFn = vi.fn().mockResolvedValue({ data: subscriptionsData });

      const result = await testCustomerPortalSession(
        validStripeCustomerId,
        validReturnUrl,
        validStripeCustomerPortalConfigId,
        flowType,
        createPortalSessionFn,
        listSubscriptionsFn
      );

      expect(result).toBe(validPortalUrl);
      expect(listSubscriptionsFn).toHaveBeenCalledTimes(1);
      expect(listSubscriptionsFn).toHaveBeenCalledWith({
        customer: validStripeCustomerId,
        status: 'all',
        limit: 100
      });
      expect(createPortalSessionFn).toHaveBeenCalledTimes(1);

      const expectedCall = {
        customer: validStripeCustomerId,
        return_url: validReturnUrl,
        configuration: validStripeCustomerPortalConfigId,
        ...(expectedFlowData && { flow_data: expectedFlowData })
      };

      expect(createPortalSessionFn).toHaveBeenCalledWith(expectedCall);

      if (!expectedFlowData) {
        // eslint-disable-next-line vitest/max-expects
        expect(createPortalSessionFn).not.toHaveBeenCalledWith(
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            flow_data: expect.any(Object)
          })
        );
      }
    }

    it('should create customer portal session successfully without flow_data when flowType is undefined', async () => {
      const mockSession = { url: validPortalUrl };
      const createPortalSessionFn = vi.fn().mockResolvedValue(mockSession);
      const listSubscriptionsFn = vi.fn().mockResolvedValue({ data: [] });

      const result = await testCustomerPortalSession(
        validStripeCustomerId,
        validReturnUrl,
        validStripeCustomerPortalConfigId,
        undefined,
        createPortalSessionFn,
        listSubscriptionsFn
      );

      expect(result).toBe(validPortalUrl);
      expect(createPortalSessionFn).toHaveBeenCalledTimes(1);
      expect(createPortalSessionFn).toHaveBeenCalledWith({
        customer: validStripeCustomerId,
        return_url: validReturnUrl,
        configuration: validStripeCustomerPortalConfigId
      });
      expect(listSubscriptionsFn).not.toHaveBeenCalled();
    });

    // eslint-disable-next-line vitest/expect-expect
    it('should create portal session with flow_data when flowType is subscription_update and subscriptions exist', async () => {
      await testPortalSession('subscription_update', [{ id: 'sub_123', status: 'active' }], {
        type: 'subscription_update',
        subscription: 'sub_123'
      });
    });

    // eslint-disable-next-line vitest/expect-expect
    it('should create portal session with flow_data when flowType is subscription_cancel and subscriptions exist', async () => {
      await testPortalSession('subscription_cancel', [{ id: 'sub_789', status: 'active' }], {
        type: 'subscription_cancel',
        subscription: 'sub_789'
      });
    });

    // eslint-disable-next-line vitest/expect-expect
    it('should create portal session with flow_data when flowType is payment_method_update and subscriptions exist', async () => {
      await testPortalSession('payment_method_update', [{ id: 'sub_payment', status: 'active' }], {
        type: 'payment_method_update',
        subscription: 'sub_payment'
      });
    });

    // eslint-disable-next-line vitest/expect-expect
    it('should create portal session without flow_data when subscription_update flowType is provided but no subscriptions exist', async () => {
      await testPortalSession('subscription_update');
    });

    // eslint-disable-next-line vitest/expect-expect
    it('should create portal session without flow_data when payment_method_update flowType is provided but no subscriptions exist', async () => {
      await testPortalSession('payment_method_update');
    });

    // eslint-disable-next-line vitest/expect-expect
    it('should create portal session without flow_data when subscription_cancel flowType is provided but only inactive subscriptions exist', async () => {
      const inactiveSubscriptions = [
        { id: 'sub_canceled', status: 'canceled' },
        { id: 'sub_incomplete', status: 'incomplete' }
      ];
      await testPortalSession('subscription_cancel', inactiveSubscriptions);
    });

    // eslint-disable-next-line vitest/expect-expect
    it('should create portal session without flow_data when payment_method_update flowType is provided but only inactive subscriptions exist', async () => {
      const inactiveSubscriptions = [
        { id: 'sub_canceled', status: 'canceled' },
        { id: 'sub_incomplete', status: 'incomplete' }
      ];
      await testPortalSession('payment_method_update', inactiveSubscriptions);
    });

    it('should throw error when customer portal session creation fails', async () => {
      const stripeError = new Error('Portal session creation failed');
      const createPortalSessionFn = vi.fn().mockRejectedValue(stripeError);
      const listSubscriptionsFn = vi.fn().mockResolvedValue({ data: [] });

      await expect(
        testCustomerPortalSession(
          validStripeCustomerId,
          validReturnUrl,
          validStripeCustomerPortalConfigId,
          undefined,
          createPortalSessionFn,
          listSubscriptionsFn
        )
      ).rejects.toThrow('Portal session creation failed');
    });

    it('should throw error when subscription listing fails', async () => {
      const stripeError = new Error('Failed to list subscriptions');
      const createPortalSessionFn = vi.fn().mockResolvedValue({ url: validPortalUrl });
      const listSubscriptionsFn = vi.fn().mockRejectedValue(stripeError);

      await expect(
        testCustomerPortalSession(
          validStripeCustomerId,
          validReturnUrl,
          validStripeCustomerPortalConfigId,
          'subscription_update',
          createPortalSessionFn,
          listSubscriptionsFn
        )
      ).rejects.toThrow('Failed to list subscriptions');
    });
  });

  describe('countSubscriptions', () => {
    it('should return 0 when customer has no subscriptions', async () => {
      const listSubscriptionsFn = vi.fn().mockResolvedValue({ data: [] });

      const result = await testCountSubscriptions(validStripeCustomerId, listSubscriptionsFn);

      expect(result).toBe(0);
      expect(listSubscriptionsFn).toHaveBeenCalledTimes(1);
      expect(listSubscriptionsFn).toHaveBeenCalledWith({
        customer: validStripeCustomerId,
        status: 'all',
        limit: 100
      });
    });

    it('should return 1 when customer has one active subscription', async () => {
      const validActiveSubscription = {
        id: 'sub_123',
        status: 'active'
      };
      const listSubscriptionsFn = vi.fn().mockResolvedValue({ data: [validActiveSubscription] });

      const result = await testCountSubscriptions(validStripeCustomerId, listSubscriptionsFn);

      expect(result).toBe(1);
    });

    it('should return 1 when customer has one past_due subscription', async () => {
      const validPastDueSubscription = {
        id: 'sub_123',
        status: 'past_due'
      };
      const listSubscriptionsFn = vi.fn().mockResolvedValue({ data: [validPastDueSubscription] });

      const result = await testCountSubscriptions(validStripeCustomerId, listSubscriptionsFn);

      expect(result).toBe(1);
    });

    it('should return correct count when customer has multiple active subscriptions', async () => {
      const validActiveSubscriptions = [
        { id: 'sub_123', status: 'active' },
        { id: 'sub_456', status: 'active' },
        { id: 'sub_789', status: 'active' }
      ];
      const listSubscriptionsFn = vi.fn().mockResolvedValue({ data: validActiveSubscriptions });

      const result = await testCountSubscriptions(validStripeCustomerId, listSubscriptionsFn);

      expect(result).toBe(3);
    });

    it('should return correct count when customer has mix of active and past_due subscriptions', async () => {
      const validMixedSubscriptions = [
        { id: 'sub_123', status: 'active' },
        { id: 'sub_456', status: 'past_due' },
        { id: 'sub_789', status: 'active' }
      ];
      const listSubscriptionsFn = vi.fn().mockResolvedValue({ data: validMixedSubscriptions });

      const result = await testCountSubscriptions(validStripeCustomerId, listSubscriptionsFn);

      expect(result).toBe(3);
    });

    it('should return 0 when customer has only canceled or unpaid subscriptions', async () => {
      const validInactiveSubscriptions = [
        { id: 'sub_123', status: 'canceled' },
        { id: 'sub_456', status: 'unpaid' },
        { id: 'sub_789', status: 'incomplete' }
      ];
      const listSubscriptionsFn = vi.fn().mockResolvedValue({ data: validInactiveSubscriptions });

      const result = await testCountSubscriptions(validStripeCustomerId, listSubscriptionsFn);

      expect(result).toBe(0);
    });

    it('should count only active and past_due from mixed statuses', async () => {
      const validAllStatusesSubscriptions = [
        { id: 'sub_1', status: 'active' },
        { id: 'sub_2', status: 'past_due' },
        { id: 'sub_3', status: 'canceled' },
        { id: 'sub_4', status: 'unpaid' },
        { id: 'sub_5', status: 'active' },
        { id: 'sub_6', status: 'incomplete' },
        { id: 'sub_7', status: 'incomplete_expired' }
      ];
      const listSubscriptionsFn = vi.fn().mockResolvedValue({
        data: validAllStatusesSubscriptions
      });

      const result = await testCountSubscriptions(validStripeCustomerId, listSubscriptionsFn);

      expect(result).toBe(3); // solo cuenta active y past_due
    });

    it('should throw error when Stripe API fails', async () => {
      const stripeError = new Error('Failed to list subscriptions');
      const listSubscriptionsFn = vi.fn().mockRejectedValue(stripeError);

      await expect(
        testCountSubscriptions(validStripeCustomerId, listSubscriptionsFn)
      ).rejects.toThrow('Failed to list subscriptions');
    });
  });

  async function testCreateCustomer(
    userIdentity: UserIdentity<IdpName>,
    createCustomerFn: () => Promise<{ id: string }>,
    testClockListFn: MockInstance = vi.fn().mockRejectedValue(new Error('Testing in anger')),
    testClockCreateFn: MockInstance = vi.fn().mockRejectedValue(new Error('Testing in anger'))
  ): Promise<StripeCustomerId> {
    const mockStripeInstance = {
      ...testClocksMockFn(testClockListFn, testClockCreateFn),
      customers: {
        create: createCustomerFn
      }
    } as unknown as Stripe;

    setupMocks(mockStripeInstance);

    const stripeService = await StripeService.withConfig(validApiKey);
    return stripeService.createCustomer(userIdentity);
  }

  async function testCheckoutSession(
    stripeCustomerId: StripeCustomerId,
    userIdentity: UserIdentity<IdpName>,
    product: Tier | Topup,
    language: LanguageCode,
    successRedirectUrl: Url,
    cancelRedirectUrl: Url,
    createSessionFn: () => Promise<Stripe.Response<Stripe.Checkout.Session>>
  ): Promise<Url | null> {
    const mockStripeInstance = {
      ...testClocksMockFn(),
      checkout: {
        sessions: {
          create: createSessionFn
        }
      }
    } as unknown as Stripe;

    setupMocks(mockStripeInstance);

    const stripeService = await StripeService.withConfig(validApiKey);
    return stripeService.createCheckoutSession(
      stripeCustomerId,
      userIdentity,
      product,
      language,
      successRedirectUrl,
      cancelRedirectUrl,
      validTaxId
    );
  }

  async function testCustomerPortalSession(
    stripeCustomerId: StripeCustomerId,
    returnUrl: Url,
    configId: string,
    flow_type:
      | Extract<
          Stripe.BillingPortal.SessionCreateParams.FlowData.Type,
          'subscription_cancel' | 'subscription_update' | 'payment_method_update'
        >
      | undefined,
    createPortalSessionFn: () => Promise<Stripe.Response<Stripe.BillingPortal.Session>>,
    listSubscriptionsFn: () => Promise<{ data: Array<{ id: string; status: string }> }>
  ): Promise<Url> {
    const mockStripeInstance = {
      ...testClocksMockFn(),
      billingPortal: {
        sessions: {
          create: createPortalSessionFn
        }
      },
      subscriptions: {
        list: listSubscriptionsFn
      }
    } as unknown as Stripe;

    setupMocks(mockStripeInstance);

    const stripeService = await StripeService.withConfig(validApiKey);
    return stripeService.createCustomerPortalSession(
      stripeCustomerId,
      returnUrl,
      configId,
      flow_type
    );
  }

  async function testCountSubscriptions(
    stripeCustomerId: StripeCustomerId,
    listSubscriptionsFn: () => Promise<{ data: Array<{ id: string; status: string }> }>
  ): Promise<number> {
    const mockStripeInstance = {
      ...testClocksMockFn(),
      subscriptions: {
        list: listSubscriptionsFn
      }
    } as unknown as Stripe;

    setupMocks(mockStripeInstance);

    const stripeService = await StripeService.withConfig(validApiKey);
    return stripeService.countSubscriptions(stripeCustomerId);
  }

  function setupMocks(mockStripeInstance: Stripe): void {
    const mockAxiosInstance = {};
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(HttpClient.prototype.getAxiosInstance).mockResolvedValue(
      mockAxiosInstance as AxiosInstance
    );
    vi.mocked(Stripe).mockImplementation(() => mockStripeInstance);
  }
});
