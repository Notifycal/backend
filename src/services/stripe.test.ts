/* eslint-disable camelcase */
import { logger } from '@common/powertools';
import type { Tier } from '@model/PaymentPlans';
import type {
  Email,
  Identity,
  IdpId,
  LanguageCode,
  StripeCustomerId,
  UserId
} from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { HttpClient } from '@services/common/http-client';
import { default as Stripe } from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { StripeService } from './stripe';
import { AxiosHttpClient } from './stripe-axios-client';

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
  const validIdentity: Identity<'google.com'> = {
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
    id: 'good',
    priceId: 'price_123456789',
    credits: 100
  };
  const validCheckoutUrl = 'https://checkout.stripe.com/pay/cs_test_123456789';
  const validPortalUrl = 'https://billing.stripe.com/session/ps_test_123456789';
  const validStripeCustomerId = 'cus_123456789' as StripeCustomerId;
  const validTaxId = 'tx_srfgwrgwrg';

  it('should initialize Stripe client with correct API key, version and httpClient', () => {
    const mockConstructor = vi.fn();
    const mockAxiosInstance = {};
    const mockGetAxiosInstance = vi.fn().mockReturnValue(mockAxiosInstance);

    vi.mocked(HttpClient).mockImplementation(
      () =>
        ({
          getAxiosInstance: mockGetAxiosInstance
        }) as unknown as HttpClient
    );
    vi.mocked(AxiosHttpClient).mockImplementation(() => ({}) as AxiosHttpClient);
    vi.mocked(Stripe).mockImplementation(mockConstructor);

    new StripeService(validApiKey);

    expect(HttpClient).toHaveBeenCalledWith(undefined, undefined, 'Stripe');
    expect(mockGetAxiosInstance).toHaveBeenCalledTimes(1);
    expect(AxiosHttpClient).toHaveBeenCalledWith(mockAxiosInstance);
    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(mockConstructor).toHaveBeenCalledWith(validApiKey, {
      apiVersion: '2025-05-28.basil',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      httpClient: expect.any(Object)
    });
  });

  describe('createCustomer', () => {
    it('should create customer successfully and return customer ID', async () => {
      const createCustomerFn = vi.fn().mockResolvedValue({ id: validStripeCustomerId });

      const result = await testCreateCustomer(validIdentity, createCustomerFn);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.info).toHaveBeenCalledWith('Creating customer in Stripe for identity', {
        identity: validIdentity
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
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session successfully and return session URL', async () => {
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
          tier: validTier.id,
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
          line_items: [
            {
              price: betterTier.priceId,
              quantity: 1,
              tax_rates: [validTaxId]
            }
          ],
          metadata: expect.objectContaining({
            tier: betterTier.id
          }) as Record<string, unknown>
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
            tier: validTier.id,
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
    it('should create customer portal session successfully and return session URL', async () => {
      const mockSession = { url: validPortalUrl };
      const createPortalSessionFn = vi.fn().mockResolvedValue(mockSession);

      const result = await testCustomerPortalSession(
        validStripeCustomerId,
        validReturnUrl,
        createPortalSessionFn
      );

      expect(result).toBe(validPortalUrl);
      expect(createPortalSessionFn).toHaveBeenCalledTimes(1);
      expect(createPortalSessionFn).toHaveBeenCalledWith({
        customer: validStripeCustomerId,
        return_url: validReturnUrl
      });
    });

    it('should throw error when customer portal session creation fails', async () => {
      const stripeError = new Error('Portal session creation failed');
      const createPortalSessionFn = vi.fn().mockRejectedValue(stripeError);

      await expect(
        testCustomerPortalSession(validStripeCustomerId, validReturnUrl, createPortalSessionFn)
      ).rejects.toThrow('Portal session creation failed');
    });
  });

  function testCreateCustomer(
    identity: Identity<'google.com'>,
    createCustomerFn: () => Promise<{ id: string }>
  ): Promise<StripeCustomerId> {
    const mockStripeInstance = {
      customers: {
        create: createCustomerFn
      }
    };

    setupMocks(mockStripeInstance);

    const stripeService = new StripeService(validApiKey);
    return stripeService.createCustomer(identity);
  }

  function testCheckoutSession(
    stripeCustomerId: StripeCustomerId,
    identity: Identity<'google.com'>,
    tier: Tier,
    language: LanguageCode,
    successRedirectUrl: Url,
    cancelRedirectUrl: Url,
    createSessionFn: () => Promise<Stripe.Response<Stripe.Checkout.Session>>
  ): Promise<Url | null> {
    const mockStripeInstance = {
      checkout: {
        sessions: {
          create: createSessionFn
        }
      }
    };

    setupMocks(mockStripeInstance);

    const stripeService = new StripeService(validApiKey);
    return stripeService.createCheckoutSession(
      stripeCustomerId,
      identity,
      tier,
      language,
      successRedirectUrl,
      cancelRedirectUrl,
      validTaxId
    );
  }

  function testCustomerPortalSession(
    stripeCustomerId: StripeCustomerId,
    returnUrl: Url,
    createPortalSessionFn: () => Promise<Stripe.Response<Stripe.BillingPortal.Session>>
  ): Promise<Url> {
    const mockStripeInstance = {
      billingPortal: {
        sessions: {
          create: createPortalSessionFn
        }
      }
    };

    setupMocks(mockStripeInstance);

    const stripeService = new StripeService(validApiKey);
    return stripeService.createCustomerPortalSession(stripeCustomerId, returnUrl);
  }

  function setupMocks(mockStripeInstance: unknown): void {
    const mockAxiosInstance = {};

    vi.mocked(HttpClient).mockImplementation(
      () =>
        ({
          getAxiosInstance: () => mockAxiosInstance
        }) as unknown as HttpClient
    );
    vi.mocked(AxiosHttpClient).mockImplementation(() => ({}) as AxiosHttpClient);
    vi.mocked(Stripe).mockImplementation(() => mockStripeInstance as Stripe);
  }
});