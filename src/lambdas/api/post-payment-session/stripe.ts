/* eslint-disable camelcase */
import type { Email, UserId } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import Stripe from 'stripe';
import type { Tier } from './config';

export class StripeCheckoutService {
  public async createCheckoutSession(
    userId: UserId,
    email: Email,
    tier: Tier,
    successRedirectUrl: Url,
    cancelRedirectUrl: Url,
    apiKey: string
  ): Promise<string | null> {
    const stripe = new Stripe(apiKey, {
      apiVersion: '2025-05-28.basil'
    });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ui_mode: 'hosted',
      payment_method_types: ['card'],
      customer_email: email,
      success_url: successRedirectUrl,
      cancel_url: cancelRedirectUrl,
      line_items: [
        {
          price: tier.priceId,
          quantity: 1
        }
      ],
      metadata: {
        userId,
        tier: tier.id,
        vatCountry: 'ES'
      },
      automatic_tax: { enabled: true }
    });
    return session.url;
  }
}
