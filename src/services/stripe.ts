/* eslint-disable camelcase */
import type { Tier } from '@model/PaymentPlans';
import type { Identity, IdpName, LanguageCode } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { default as Stripe } from 'stripe';

export class StripeService {
  private readonly stripeClient: Stripe;

  public constructor(apiKey: string) {
    this.stripeClient = new Stripe(apiKey, {
      apiVersion: '2025-05-28.basil'
    });
  }

  public async createCheckoutSession(
    identity: Identity<IdpName>,
    tier: Tier,
    language: LanguageCode,
    successRedirectUrl: Url,
    cancelRedirectUrl: Url
  ): Promise<Url | null> {
    const { userId, idp, idpId, email } = identity;
    const session = await this.stripeClient.checkout.sessions.create({
      mode: 'subscription',
      ui_mode: 'hosted',
      payment_method_types: ['card'],
      customer_email: email,
      success_url: successRedirectUrl,
      cancel_url: cancelRedirectUrl,
      locale: language,
      line_items: [
        {
          price: tier.priceId,
          quantity: 1
        }
      ],
      metadata: {
        userId,
        idp,
        idpId,
        email,
        tier: tier.id,
        vatCountry: 'ES'
      },
      automatic_tax: { enabled: true }
    });
    return session.url as Url | null;
  }
}
