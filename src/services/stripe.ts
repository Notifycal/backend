/* eslint-disable camelcase */
import { logger } from '@common/powertools';
import type { Tier } from '@model/PaymentPlans';
import type { Identity, IdpName, LanguageCode, StripeCustomerId } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { HttpClient } from '@services/common/http-client';
import { default as Stripe } from 'stripe';
import { AxiosHttpClient } from './stripe-axios-client';

export class StripeService {
  private readonly stripeClient: Stripe;

  public constructor(apiKey: string) {
    const httpClient = new HttpClient(undefined, undefined, 'Stripe');
    this.stripeClient = new Stripe(apiKey, {
      apiVersion: '2025-05-28.basil',
      httpClient: new AxiosHttpClient(httpClient.getAxiosInstance())
    });
  }

  public createCustomer(identity: Identity<IdpName>): Promise<StripeCustomerId> {
    const { userId, idp, idpId, email } = identity;
    logger.info(`Creating customer in Stripe for identity`, {
      identity
    });
    return this.stripeClient.customers
      .create({
        email: email,
        metadata: {
          userId,
          idp,
          idpId,
          email
        }
      })
      .then((customer) => customer.id as StripeCustomerId);
  }

  public createCheckoutSession(
    stripeCustomerId: StripeCustomerId,
    identity: Identity<IdpName>,
    tier: Tier,
    language: LanguageCode,
    successRedirectUrl: Url,
    cancelRedirectUrl: Url,
    taxId: string
  ): Promise<Url | null> {
    const { userId, idp, idpId, email } = identity;
    return this.stripeClient.checkout.sessions
      .create({
        mode: 'subscription',
        ui_mode: 'hosted',
        payment_method_types: ['card'],
        customer: stripeCustomerId,
        customer_update: {
          name: 'auto',
          address: 'auto'
        },
        client_reference_id: userId,
        success_url: successRedirectUrl,
        cancel_url: cancelRedirectUrl,
        locale: language,
        line_items: [
          {
            price: tier.priceId,
            quantity: 1,
            tax_rates: [taxId]
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
        automatic_tax: { enabled: false },
        billing_address_collection: 'required',
        tax_id_collection: {
          enabled: true
        }
      })
      .then((session) => session.url as Url | null);
  }

  public createCustomerPortalSession(
    stripeCustomerId: StripeCustomerId,
    returnUrl: Url,
    configId: string
  ): Promise<Url> {
    return this.stripeClient.billingPortal.sessions
      .create({
        customer: stripeCustomerId,
        return_url: returnUrl,
        configuration: configId
      })
      .then((session) => session.url as Url);
  }
}
