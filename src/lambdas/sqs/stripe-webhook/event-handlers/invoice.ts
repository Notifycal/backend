/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { CreditAdditionResult } from '@model/Credits';
import type { TierMap, TopupMap } from '@model/PaymentPlans';
import type { IdpName, TierId, TopupId, UserIdentity } from '@notifycal/shared/types';
import type { StripeService } from '@services/stripe';
import type { SubscriptionService } from '@services/subscription';
import type { TopupService } from '@services/topup';
import type Stripe from 'stripe';
import { match } from 'ts-pattern';
import type { StripeEventType } from '../stripe-schemas';
import { BaseHandler } from './base-handler';
import type { EventHandler } from './common';

export class InvoiceCreatedHandler
  extends BaseHandler
  implements EventHandler<Stripe.InvoiceCreatedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.InvoiceCreatedEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const invoice = event.data.object;
    this.logger.info('Handling invoice created', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due,
      userId: userIdentity.userId
    });
    return Promise.resolve();
  }
}

export class InvoicePaymentSucceededHandler
  extends BaseHandler
  implements EventHandler<Stripe.InvoicePaymentSucceededEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly tiers: TierMap,
    private readonly topups: TopupMap,
    private readonly subscriptionService: SubscriptionService<IdpName>,
    private readonly topupService: TopupService<IdpName>,
    private readonly stripeService: StripeService,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.InvoicePaymentSucceededEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const invoice = event.data.object;
    this.logger.info('Handling invoice payment succeeded', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid,
      billingReason: invoice.billing_reason,
      userId: userIdentity.userId
    });
    return match(invoice)
      .with({ billing_reason: 'subscription_create' }, () =>
        this.createHandler(invoice, userIdentity)
      )
      .with({ billing_reason: 'subscription_cycle' }, () =>
        this.renewHandler(invoice, userIdentity)
      )
      .with({ billing_reason: 'subscription_update' }, (invoice) =>
        this.handleSubscriptionUpdate(userIdentity, invoice)
      )
      .with({ billing_reason: 'manual' }, (invoice) => this.topupHandler(invoice, userIdentity))
      .otherwise((invoice) => {
        this.logger.warn('Unhandled billing reason', {
          invoiceId: invoice.id,
          billingReason: invoice.billing_reason
        });
        return Promise.resolve();
      });
  }

  private createHandler(
    invoice: Stripe.Invoice,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const firstConceptInInvoice = invoice.lines.data[0];
    return this.extractProduct(firstConceptInInvoice, this.tiers).then(
      (tierId) =>
        this.subscriptionService
          .create(userIdentity, tierId)
          .then((r) => this.creditAdditionHandler(r)),
      (error) => this.errorHandler('create-subscription')(error)
    );
  }

  private renewHandler(
    invoice: Stripe.Invoice,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const firstConceptInInvoice = invoice.lines.data[0];
    return this.extractProduct(firstConceptInInvoice, this.tiers).then(
      (tierId) =>
        this.subscriptionService
          .renew(userIdentity, tierId)
          .then((r) => this.creditAdditionHandler(r)),
      (error) => this.errorHandler('renew-subscription')(error)
    );
  }

  private handleSubscriptionUpdate(
    userIdentity: UserIdentity<IdpName>,
    invoice: Stripe.Invoice
  ): Promise<void> {
    const updateType = this.determineUpdateType(invoice);
    return this.extractUpdateTiers(invoice).then(
      (tiers) => this.executeSubscriptionUpdate(userIdentity, invoice, tiers, updateType),
      (error) =>
        Promise.reject(
          new Error(
            `Error while doing ${updateType}: tiers could not be extracted out of the invoice`,
            { cause: error }
          )
        )
    );
  }

  private determineUpdateType(
    invoice: Stripe.Invoice
  ): 'upgrade-subscription' | 'downgrade-subscription' | 'undetermined' {
    return invoice.amount_paid > 0
      ? 'upgrade-subscription'
      : invoice.amount_paid === 0
        ? 'downgrade-subscription'
        : 'undetermined';
  }

  private extractUpdateTiers(
    invoice: Stripe.Invoice
  ): Promise<{ previousTier: TierId; currentTier: TierId }> {
    const previousTierInvoiceLineItem = invoice.lines.data[0];
    const currentTierInvoiceLineItem = invoice.lines.data[1];
    return Promise.all([
      this.extractProduct(previousTierInvoiceLineItem, this.tiers),
      this.extractProduct(currentTierInvoiceLineItem, this.tiers)
    ]).then(
      ([previousTier, currentTier]) => ({
        previousTier,
        currentTier
      }),
      (error) =>
        Promise.reject(
          new Error(`Missing invoice line items for subscription update. Invoice: ${invoice.id}`, {
            cause: error
          })
        )
    );
  }

  private async executeSubscriptionUpdate(
    userIdentity: UserIdentity<IdpName>,
    invoice: Stripe.Invoice,
    tiers: { previousTier: TierId; currentTier: TierId },
    updateType: 'upgrade-subscription' | 'downgrade-subscription' | 'undetermined'
  ): Promise<void> {
    return match(updateType)
      .with('upgrade-subscription', () => {
        return this.totalPaidInBillingCycleWithRespectToCurrentPlan(invoice, this.stripeService)
          .then((currentPlanPaidPercentage) =>
            this.subscriptionService.upgrade(
              userIdentity,
              tiers.previousTier,
              tiers.currentTier,
              currentPlanPaidPercentage
            )
          )
          .then(
            () => {},
            (e) => this.errorHandler('upgrade-subscription')(e)
          );
      })
      .with('downgrade-subscription', () =>
        this.subscriptionService
          .scheduleDowngrade(userIdentity)
          .catch((error) => this.errorHandler('downgrade-subscription')(error))
      )
      .with('undetermined', () =>
        Promise.reject(
          new Error(
            `Failed to infer what kind of subscription update has been performed. Most likely, the amount_paid is unexpected`
          )
        )
      )
      .exhaustive();
  }

  private topupHandler(
    invoice: Stripe.Invoice,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const product = invoice.lines.data[0];
    const quantity = product?.quantity || 0;
    if (quantity <= 0) {
      return this.errorHandler('topup')(
        new Error(`Quantity is not greater than 0. Quantity: ${product?.quantity}`)
      );
    }
    return this.extractProduct(product, this.topups).then(
      (topupId) =>
        this.topupService.add(userIdentity, topupId, quantity).then(
          (r) => this.creditAdditionHandler(r),
          (error) => this.errorHandler('topup')(error)
        ),
      (error) => this.errorHandler('topup')(error)
    );
  }

  private creditAdditionHandler(result: CreditAdditionResult<'reset' | 'add'>): Promise<void> {
    return (
      match(result)
        .with({ success: true }, () => Promise.resolve())
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        .with({ success: false }, (r) => Promise.reject(r.error))
        .exhaustive()
    );
  }

  private errorHandler(
    operation:
      | 'create-subscription'
      | 'renew-subscription'
      | 'upgrade-subscription'
      | 'downgrade-subscription'
      | 'topup'
  ): (error: unknown) => Promise<never> {
    return this.handleError(operation);
  }

  private extractProduct<K extends TierId | TopupId>(
    invoiceItem: Stripe.InvoiceLineItem | undefined,
    products: Record<string, { id: K; priceId: string }>
  ): Promise<K> {
    const priceId = invoiceItem?.pricing?.price_details?.price;
    if (!priceId) {
      return Promise.reject(
        new Error(
          `No price ID found in invoice line item. Invoice item ID: ${invoiceItem?.id || 'unknown'}`
        )
      );
    }
    const product = Object.values(products).find((p) => p.priceId === priceId);
    if (!product) {
      return Promise.reject(
        new Error(
          `Unknown price ID: ${priceId}. No matching tier/topup found. Invoice item ID: ${invoiceItem.id}`
        )
      );
    }
    return Promise.resolve(product.id);
  }
}
export class InvoicePaymentFailedHandler
  extends BaseHandler
  implements EventHandler<Stripe.InvoicePaymentFailedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.InvoicePaymentFailedEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const invoice = event.data.object;
    this.logger.info('Handling invoice payment failed', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due,
      userId: userIdentity.userId
    });
    return Promise.resolve();
  }
}
