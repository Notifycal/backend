/* eslint-disable camelcase */
import type { Email, LanguageCode, UserId } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { default as Stripe } from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import type { Tier } from '../lambdas/api/post-payment-session/config';
import { StripeService } from './stripe';

vi.mock('stripe');
const validApiKey = 'sk_test_123456789';

describe(StripeService, () => {
  const validUserId = 'cfaa8471-f4cc-44da-bc22-ddc4b735a847' as UserId;
  const validEmail = 'test@notifycal.com' as Email;
  const validLanguage = 'en' as LanguageCode;
  const validSuccessUrl = 'https://example.com/success' as Url;
  const validCancelUrl = 'https://example.com/cancel' as Url;
  const validTier: Tier = {
    id: 'good',
    priceId: 'price_123456789'
  };
  const validCheckoutUrl = 'https://checkout.stripe.com/pay/cs_test_123456789';

  it('should initialize Stripe client with correct API key and version', () => {
    const mockConstructor = vi.fn();
    vi.mocked(Stripe).mockImplementation(mockConstructor);

    new StripeService(validApiKey);

    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(mockConstructor).toHaveBeenCalledWith(validApiKey, {
      apiVersion: '2025-05-28.basil'
    });
  });

  it('should create checkout session successfully and return session URL', async () => {
    const mockSession = { url: validCheckoutUrl };
    const createSessionFn = vi.fn().mockResolvedValue(mockSession);

    const result = await testIt(
      validUserId,
      validEmail,
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
      customer_email: validEmail,
      success_url: validSuccessUrl,
      cancel_url: validCancelUrl,
      locale: validLanguage,
      line_items: [
        {
          price: validTier.priceId,
          quantity: 1
        }
      ],
      metadata: {
        userId: validUserId,
        tier: validTier.id,
        vatCountry: 'ES'
      },
      automatic_tax: { enabled: true }
    });
  });

  it('should return null when session URL is null', async () => {
    const mockSession = { url: null };
    const createSessionFn = vi.fn().mockResolvedValue(mockSession);

    const result = await testIt(
      validUserId,
      validEmail,
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

    await testIt(
      validUserId,
      validEmail,
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
      priceId: 'price_better_123'
    };
    const mockSession = { url: validCheckoutUrl };
    const createSessionFn = vi.fn().mockResolvedValue(mockSession);

    await testIt(
      validUserId,
      validEmail,
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
            quantity: 1
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
      testIt(
        validUserId,
        validEmail,
        validTier,
        validLanguage,
        validSuccessUrl,
        validCancelUrl,
        createSessionFn
      )
    ).rejects.toThrow('Stripe API error');
  });

  it('should include all required metadata in checkout session', async () => {
    const mockSession = { url: validCheckoutUrl };
    const createSessionFn = vi.fn().mockResolvedValue(mockSession);

    await testIt(
      validUserId,
      validEmail,
      validTier,
      validLanguage,
      validSuccessUrl,
      validCancelUrl,
      createSessionFn
    );

    expect(createSessionFn).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          userId: validUserId,
          tier: validTier.id,
          vatCountry: 'ES'
        }
      })
    );
  });
});

async function testIt(
  userId: UserId,
  email: Email,
  tier: Tier,
  language: LanguageCode,
  successRedirectUrl: Url,
  cancelRedirectUrl: Url,
  createSessionFn: () => Promise<Stripe.Response<Stripe.Checkout.Session>>
): Promise<string | null> {
  const mockStripeInstance = {
    checkout: {
      sessions: {
        create: createSessionFn
      }
    }
  };

  vi.mocked(Stripe).mockImplementation(() => mockStripeInstance as unknown as Stripe);

  const stripeService = new StripeService(validApiKey);
  return stripeService.createCheckoutSession(
    userId,
    email,
    tier,
    language,
    successRedirectUrl,
    cancelRedirectUrl
  );
}
