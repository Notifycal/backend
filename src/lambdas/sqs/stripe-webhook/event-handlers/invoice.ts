/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { TierId, TierMap, TopupId, TopupMap } from '@model/PaymentPlans';
import type { Identity, IdpName, UserId } from '@notifycal/shared/types';
import type { CreditAdditionResult } from '@services/credits-service';
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

  public handle(event: Stripe.InvoiceCreatedEvent, identity: Identity<IdpName>): Promise<void> {
    const invoice = event.data.object;
    this.logger.info('Handling invoice created', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due,
      userId: identity.userId
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
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.InvoicePaymentSucceededEvent,
    identity: Identity<IdpName>
  ): Promise<void> {
    const invoice = event.data.object;
    this.logger.info('Handling invoice payment succeeded', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid,
      billingReason: invoice.billing_reason,
      userId: identity.userId
    });
    const userId = identity.userId;
    return match(invoice)
      .with({ billing_reason: 'subscription_create' }, () => this.createHandler(invoice, userId))
      .with({ billing_reason: 'subscription_cycle' }, () => this.renewHandler(invoice, userId))
      .with({ billing_reason: 'subscription_update' }, (invoice) =>
        this.handleSubscriptionUpdate(userId, invoice)
      )
      .with({ billing_reason: 'manual' }, (invoice) => this.topupHandler(invoice, userId))
      .otherwise((invoice) => {
        this.logger.warn('Unhandled billing reason', {
          invoiceId: invoice.id,
          billingReason: invoice.billing_reason
        });
        return Promise.resolve();
      });
  }

  private topupHandler(invoice: Stripe.Invoice, userId: UserId): Promise<void> {
    const product = invoice.lines.data[0];
    if ((product.quantity ?? 0) <= 0) {
      return this.errorHandler('topup')(
        new Error(`Quantity is not greater than 0. Quantity: ${product.quantity}`)
      );
    }
    return this.extractProduct(product, this.topups).then(
      (topupId) =>
        this.topupService
          .add(userId, topupId, product.quantity || 0)
          .then((r) => this.creditAdditionHandler(r)),
      (error) => this.errorHandler('topup')(error)
    );
  }

  private createHandler(invoice: Stripe.Invoice, userId: UserId): Promise<void> {
    return this.extractProduct(invoice.lines.data[0], this.tiers).then(
      (tierId) =>
        this.subscriptionService.create(userId, tierId).then((r) => this.creditAdditionHandler(r)),
      (error) => this.errorHandler('create-subscription')(error)
    );
  }

  private renewHandler(invoice: Stripe.Invoice, userId: UserId): Promise<void> {
    return this.extractProduct(invoice.lines.data[0], this.tiers).then(
      (tierId) =>
        this.subscriptionService.renew(userId, tierId).then((r) => this.creditAdditionHandler(r)),
      (error) => this.errorHandler('renew-subscription')(error)
    );
  }

  private handleSubscriptionUpdate(userId: UserId, invoice: Stripe.Invoice): Promise<void> {
    const updateType = this.determineUpdateType(invoice);
    return this.extractUpdateTiers(invoice).then(
      (tiers) => this.executeSubscriptionUpdate(userId, invoice, tiers, updateType),
      (error) =>
        Promise.reject(
          new Error(
            `Error while doing ${updateType}: tiers could not be extracted out of the invoice`,
            { cause: error }
          )
        )
    );
  }

  private determineUpdateType(invoice: Stripe.Invoice): 'upgrade' | 'downgrade' {
    return invoice.amount_paid > 0 ? 'upgrade' : 'downgrade';
  }

  private extractUpdateTiers(
    invoice: Stripe.Invoice
  ): Promise<{ previousTier: TierId; currentTier: TierId }> {
    const previousTierInvoiceLineItem = invoice.lines.data[0];
    const currentTierInvoiceLineItem = invoice.lines.data[1];

    return Promise.all([
      this.extractProduct(previousTierInvoiceLineItem, this.tiers),
      this.extractProduct(currentTierInvoiceLineItem, this.tiers)
    ]).then(([previousTier, currentTier]) => ({
      previousTier,
      currentTier
    }));
  }

  private async executeSubscriptionUpdate(
    userId: UserId,
    invoice: Stripe.Invoice,
    tiers: { previousTier: TierId; currentTier: TierId },
    updateType: 'upgrade' | 'downgrade'
  ): Promise<void> {
    return match(updateType)
      .with('upgrade', () => {
        return this.calculateRemainingCyclePercentageFromInvoice(invoice)
          .then((remainingPercentage) =>
            this.subscriptionService.upgrade(
              userId,
              tiers.previousTier,
              tiers.currentTier,
              remainingPercentage
            )
          )
          .then(
            () => {},
            (e) => this.errorHandler('upgrade-subscription')(e)
          );
      })
      .with('downgrade', () =>
        this.subscriptionService
          .downgrade(userId)
          .catch((error) => this.errorHandler('downgrade-subscription')(error))
      )
      .exhaustive();
  }

  private creditAdditionHandler(result: CreditAdditionResult): Promise<void> {
    return (
      match(result)
        .with({ operationId: 'Success' }, () => Promise.resolve())
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        .with({ operationId: 'UnknownError' }, (r) => Promise.reject(r.error))
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
    invoiceItem: Stripe.InvoiceLineItem,
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
    identity: Identity<IdpName>
  ): Promise<void> {
    const invoice = event.data.object;
    this.logger.info('Handling invoice payment failed', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due,
      userId: identity.userId
    });
    return Promise.resolve();
  }
}
