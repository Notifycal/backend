/* eslint-disable camelcase */
import { logger } from '@common/powertools';
import type { Tier, Topup } from '@model/PaymentPlans';
import type {
  Email,
  IdpName,
  LanguageCode,
  StripeCustomerId,
  UserIdentity
} from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { HttpClient } from '@services/common/http-client';
import { default as Stripe } from 'stripe';
import { match, P } from 'ts-pattern';
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
      apiVersion: '2025-06-30.basil',
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

  public createCustomer(userIdentity: UserIdentity<IdpName>): Promise<StripeCustomerId> {
    const { userId, idp, idpId, email } = userIdentity;
    logger.info(`Creating customer in Stripe for user identity`, {
      userIdentity
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
    userIdentity: UserIdentity<IdpName>,
    product: Tier | Topup,
    language: LanguageCode,
    successRedirectUrl: Url,
    cancelRedirectUrl: Url,
    taxId: string
  ): Promise<Url | null> {
    const { userId, idp, idpId, email } = userIdentity;
    const productConfig: Partial<Stripe.Checkout.SessionCreateParams> = match(product.type)
      .with('tier', () => ({ mode: 'subscription' as const }))
      .with('topup', () => ({
        mode: 'payment' as const,
        // From Docs: Generate a post-purchase Invoice for one-time payments.
        // If you disable it is highly recommended the topups event handler, currently located
        // in 'invoice.payment_succeeded', in the webhook gets relocated to 'payment_intent.succeeded' or something
        invoice_creation: {
          enabled: true
        }
      }))
      .exhaustive();
    const lineItemConfig: Stripe.Checkout.SessionCreateParams.LineItem = match(product.type)
      .with('tier', () => ({
        price: product.priceId,
        quantity: 1,
        tax_rates: [taxId]
      }))
      .with('topup', () => ({
        price: product.priceId,
        quantity: 1,
        tax_rates: [taxId],
        adjustable_quantity: {
          enabled: true,
          minimum: 1,
          maximum: 99
        }
      }))
      .exhaustive();
    return this.stripeClient.checkout.sessions
      .create({
        ...productConfig,
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
        line_items: [lineItemConfig],
        metadata: {
          userId,
          idp,
          idpId,
          email,
          product: product.id,
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
    configId: string,
    flowType:
      | Extract<
          Stripe.BillingPortal.SessionCreateParams.FlowData.Type,
          'subscription_cancel' | 'subscription_update'
        >
      | undefined
  ): Promise<Url> {
    return match(flowType)
      .with(P.union('subscription_cancel', 'subscription_update'), (flowType) => {
        return this.getSubscriptions(stripeCustomerId).then((subscriptions) => {
          const subscriptionId = subscriptions[0]?.id;
          return subscriptions[0]?.id
            ? {
                flow_data: {
                  type: flowType,
                  ...(subscriptionId && { subscription: subscriptionId })
                }
              }
            : {};
        });
      })
      .with(undefined, () => Promise.resolve({}))
      .exhaustive()
      .then((flowDataConfig) => {
        return this.stripeClient.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: returnUrl,
          configuration: configId,
          ...flowDataConfig
        });
      })
      .then((session) => session.url as Url);
  }

  public getSubscriptions(stripeCustomerId: StripeCustomerId): Promise<Array<Stripe.Subscription>> {
    return this.stripeClient.subscriptions
      .list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 100
      })
      .then((subscriptions) =>
        subscriptions.data.filter(
          (subscription) => subscription.status === 'active' || subscription.status === 'past_due'
        )
      );
  }

  public countSubscriptions(stripeCustomerId: StripeCustomerId): Promise<number> {
    return this.getSubscriptions(stripeCustomerId).then((subscriptions) => subscriptions.length);
  }
}
