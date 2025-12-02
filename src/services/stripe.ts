/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import { logger } from '@common/powertools';
import type { TierWithFreeTrial, Topup } from '@model/PaymentPlans';
import type {
  Email,
  IdpName,
  LanguageCode,
  StripeCustomerId,
  UnixTimestamp,
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

  private constructor(
    stripeClient: Stripe,
    liveMode: boolean,
    private readonly logger: Logger
  ) {
    this.stripeClient = stripeClient;
    this.liveMode = liveMode;
  }

  public static async withConfig(apiKey: string, logger: Logger): Promise<StripeService> {
    const httpClient = new HttpClient(undefined, undefined, 'Stripe');
    const stripeClient = new Stripe(apiKey, {
      apiVersion: '2025-11-17.clover',
      httpClient: new AxiosHttpClient(httpClient.getAxiosInstance())
    });

    const liveMode = await stripeClient.testHelpers.testClocks.list({ limit: 1 }).then(
      () => false,
      () => true
    );

    return new StripeService(stripeClient, liveMode, logger);
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
    product: TierWithFreeTrial | Topup,
    language: LanguageCode,
    successRedirectUrl: Url,
    cancelRedirectUrl: Url,
    taxId: string
  ): Promise<Url | null> {
    const { userId, idp, idpId, email } = userIdentity;
    const freeTrialParamsOptional: Partial<Stripe.Checkout.SessionCreateParams> =
      product.id === 'good-trial'
        ? {
            payment_method_collection: 'if_required' as const,
            subscription_data: {
              trial_period_days: 30,
              trial_settings: {
                end_behavior: {
                  missing_payment_method: 'cancel' as const
                }
              }
            }
          }
        : {};
    const productConfig: Partial<Stripe.Checkout.SessionCreateParams> = match(product.type)
      .with('tier', () => ({
        mode: 'subscription' as const,
        ...freeTrialParamsOptional
      }))
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
        locale: language === 'ca' ? 'es' : language,
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
    language: LanguageCode,
    flowType:
      | Extract<
          Stripe.BillingPortal.SessionCreateParams.FlowData.Type,
          'subscription_cancel' | 'subscription_update' | 'payment_method_update'
        >
      | undefined
  ): Promise<Url> {
    return match(flowType)
      .with(
        P.union('subscription_cancel', 'subscription_update', 'payment_method_update'),
        (flowType) => {
          return this.getActiveSubscriptions(stripeCustomerId).then((subscriptions) => {
            const hasSubscriptions = subscriptions.length > 0;
            const subscription = subscriptions[0];
            const subscriptionId = subscription?.id;

            if (!hasSubscriptions) return {};

            const needsSubscriptionId =
              flowType === 'subscription_cancel' || flowType === 'subscription_update';
            if (needsSubscriptionId && !subscriptionId) return {};
            if (
              flowType === 'subscription_cancel' &&
              subscription &&
              subscription.cancel_at_period_end
            )
              return {};

            const flowData: Stripe.BillingPortal.SessionCreateParams.FlowData = {
              type: flowType,
              after_completion: {
                type: 'redirect',
                redirect: {
                  return_url: returnUrl
                }
              },
              ...(needsSubscriptionId && { [flowType]: { subscription: subscriptionId } })
            };

            return { flow_data: flowData };
          });
        }
      )
      .with(undefined, () => Promise.resolve({}))
      .exhaustive()
      .then((flowDataConfig) => {
        const params: Stripe.BillingPortal.SessionCreateParams = {
          customer: stripeCustomerId,
          return_url: returnUrl,
          configuration: configId,
          locale: language === 'ca' ? 'es' : language,
          ...flowDataConfig
        };
        return this.stripeClient.billingPortal.sessions.create(params);
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
      .then((subscriptions) => subscriptions.data);
  }

  public getActiveSubscriptions(
    stripeCustomerId: StripeCustomerId
  ): Promise<Array<Stripe.Subscription>> {
    return this.getSubscriptions(stripeCustomerId).then((subscriptions) =>
      subscriptions.filter(
        (subscription) => subscription.status === 'active' || subscription.status === 'past_due'
      )
    );
  }

  public countActiveSubscriptions(stripeCustomerId: StripeCustomerId): Promise<number> {
    return this.getActiveSubscriptions(stripeCustomerId).then(
      (subscriptions) => subscriptions.length
    );
  }

  public forcePaymentCollection(invoiceId: string): Promise<void> {
    return this.stripeClient.invoices
      .finalizeInvoice(invoiceId, {
        auto_advance: true
      })
      .then((finalizeResult) => {
        this.logger.info(`Result of finalizing invoice`, {
          invoiceId,
          result: finalizeResult
        });
        if (finalizeResult.status === 'open') {
          return this.stripeClient.invoices.pay(finalizeResult.id).then(
            (payResult) => {
              logger.info('Successfully charged renewal immediately', {
                payResult
              });
            },
            (error) => {
              logger.warn(
                'Failed to immediately collect renewal payment. Invoice will be charged in normal Stripe retry cycle. The downside is upgrades might not be correctly handled until then (1 hour).',
                { error }
              );
            }
          );
        }
        this.logger.info(
          `The result of finalizing a draft renewal invoice has not been the invoice is open`
        );
        return Promise.resolve();
      });
  }

  public totalPaidInSubscriptionInvoicesWithinBillingCycle(
    subscriptionId: string,
    billingCycleStart: UnixTimestamp,
    billingCycleEnd: UnixTimestamp,
    invoice: Stripe.Invoice
  ): Promise<number> {
    // In order to understand Stripe stuff and this filtering, here are the [docs](https://docs.stripe.com/api/invoices/object)
    const creationOrRenewalOrUpgrade: Array<Stripe.Invoice.BillingReason> = [
      'subscription_create',
      'subscription_update', // Upgrade or downgrade
      'subscription_cycle' // Renewal
    ];
    const billingReasonPredicate = (i: Stripe.Invoice): boolean => {
      return (
        i.status === 'paid' &&
        i.billing_reason !== null &&
        creationOrRenewalOrUpgrade.includes(i.billing_reason) &&
        i.amount_paid > 0 // 'total' !== 'amount paid'. From docs: total -> "Total after discounts and taxes" whereas amount_paid has no interpretation.
      );
    };

    return this.getInvoicesInPeriod(subscriptionId, billingCycleStart, billingCycleEnd).then(
      (invoicesInPeriodEventuallyConsistent) => {
        // Workaround: because the parameter 'created' of stripe.invoices.list does not work properly/filter as expected - it returns nothing -,
        // we are using stripe.invoices.search API.
        // Invoices Search API is eventuallly consistent [as per docs](https://docs.stripe.com/api/subscriptions/search), therefore,
        // sometimes the just created upgrade invoice does not get retrieved by the API.
        // They claim data is searchable in less than a minute under normal conditions.
        // That's why we look it up and if it is not present we add it to the list for the calculation.
        const fetchedInvoicesToCalculateTotalInBillingCycle =
          invoicesInPeriodEventuallyConsistent.data.some((i) => i.id === invoice.id)
            ? invoicesInPeriodEventuallyConsistent.data
            : [invoice, ...invoicesInPeriodEventuallyConsistent.data];

        const allInvoicesSatisyingThePredicate =
          fetchedInvoicesToCalculateTotalInBillingCycle.filter(billingReasonPredicate);
        const totalPaidWithinBillingCycle = allInvoicesSatisyingThePredicate.reduce(
          (sum, invoice) => sum + invoice.amount_paid,
          0
        );
        const fetchedInvoicesToCalculateTotalInBillingCycleIds =
          fetchedInvoicesToCalculateTotalInBillingCycle.map((v) => v.id);
        const allInvoicesSatisyingThePredicateIds = allInvoicesSatisyingThePredicate.map(
          (v) => v.id
        );
        this.logger.appendKeys({
          subscriptionId,
          periodStart: billingCycleStart,
          periodEnd: billingCycleEnd,
          invoicesInPeriodEventuallyConsistent,
          fetchedInvoicesToCalculateTotalInBillingCycleIds,
          allInvoicesSatisyingThePredicateIds,
          totalPaidWithinBillingCycle
        });
        this.logger.info(`Relevant information related to upgrade`);
        return totalPaidWithinBillingCycle;
      }
    );
  }

  private getInvoicesInPeriod(
    subscriptionId: string,
    periodStart: UnixTimestamp,
    periodEnd: UnixTimestamp
  ): Stripe.ApiSearchResultPromise<Stripe.Invoice> {
    return this.stripeClient.invoices.search({
      query: `subscription:"${subscriptionId}" AND created>=${periodStart} AND created<=${periodEnd}`
    });
  }
}
