/* eslint-disable camelcase */
import { logger } from '@common/powertools';
import type { Tier, Topup } from '@model/PaymentPlans';
import type {
  Email,
  Identity,
  IdpName,
  LanguageCode,
  StripeCustomerId
} from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { HttpClient } from '@services/common/http-client';
import { default as Stripe } from 'stripe';
import { match } from 'ts-pattern';
import { AxiosHttpClient } from './stripe-axios-client';

export class StripeService {
  private readonly stripeClient: Stripe;
  private readonly liveMode: boolean;

  private constructor(stripeClient: Stripe, liveMode: boolean) {
    this.stripeClient = stripeClient;
    this.liveMode = liveMode;
  }

  public static async withConfig(apiKey: string): Promise<StripeService> {
    const httpClient = new HttpClient(undefined, undefined, 'Stripe');
    const stripeClient = new Stripe(apiKey, {
      apiVersion: '2025-05-28.basil',
      httpClient: new AxiosHttpClient(httpClient.getAxiosInstance())
    });

    const liveMode = await stripeClient.testHelpers.testClocks.list({ limit: 1 }).then(
      () => false,
      () => true
    );

    return new StripeService(stripeClient, liveMode);
  }

  private createTestClock(userEmail: Email): Promise<string> {
    return this.stripeClient.testHelpers.testClocks
      .create({
        frozen_time: Math.floor(Date.now() / 1000),
        name: `${userEmail} at ${new Date().toISOString()}`
      })
      .then((testClock) => {
        logger.info(`Created test clock for ${userEmail}`, { testClockId: testClock.id });
        return testClock.id;
      });
  }

  private withTestClockIfLiveModeOff(
    params: Stripe.CustomerCreateParams,
    userEmail: Email
  ): Promise<Stripe.CustomerCreateParams> {
    return this.liveMode
      ? Promise.resolve(params)
      : this.createTestClock(userEmail).then((testClockId) => ({
          ...params,
          test_clock: testClockId
        }));
  }

  public createCustomer(identity: Identity<IdpName>): Promise<StripeCustomerId> {
    const { userId, idp, idpId, email } = identity;
    logger.info(`Creating customer in Stripe for identity`, {
      identity
    });
    const params: Stripe.CustomerCreateParams = {
      email: email,
      metadata: {
        userId,
        idp,
        idpId,
        email
      }
    };
    return this.withTestClockIfLiveModeOff(params, email)
      .then((paramsWithTestClockIfLiveModeOff) =>
        this.stripeClient.customers.create(paramsWithTestClockIfLiveModeOff)
      )
      .then((customer) => customer.id as StripeCustomerId);
  }

  public createCheckoutSession(
    stripeCustomerId: StripeCustomerId,
    identity: Identity<IdpName>,
    product: Tier | Topup,
    language: LanguageCode,
    successRedirectUrl: Url,
    cancelRedirectUrl: Url,
    taxId: string
  ): Promise<Url | null> {
    const { userId, idp, idpId, email } = identity;
    return this.stripeClient.checkout.sessions
      .create({
        mode: match(product)
          .with({ type: 'tier' }, () => 'subscription' as const)
          .with({ type: 'topup' }, () => 'payment' as const)
          .exhaustive(),
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
            price: product.priceId,
            quantity: 1,
            tax_rates: [taxId]
          }
        ],
        metadata: {
          userId,
          idp,
          idpId,
          email,
          product: product.id,
          vatCountry: 'ES'
        },
        // From Docs: Generate a post-purchase Invoice for one-time payments.
        // If you disable it is highly recommended the topups event handler, currently located
        // in 'invoice.payment_succeeded', in the webhook gets relocated to 'payment_intent.succeeded' or something
        invoice_creation: {
          enabled: true
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
