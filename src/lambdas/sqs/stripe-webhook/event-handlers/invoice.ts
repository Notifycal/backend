/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { TierId, Tiers } from '@model/PaymentPlans';
import type { Identity, IdpName, UnixTimestamp, UserId } from '@notifycal/shared/types';
import type { CreditAdditionResult } from '@services/credits-service';
import type { SubscriptionService } from '@services/subscription-service';
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
    private readonly tiers: Tiers,
    private readonly subscriptionService: SubscriptionService<IdpName>,
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
      .otherwise((invoice) => {
        this.logger.warn('Unhandled billing reason', {
          invoiceId: invoice.id,
          billingReason: invoice.billing_reason
        });
        return Promise.resolve();
      });
  }

  private createHandler(invoice: Stripe.Invoice, userId: UserId): Promise<void> {
    return this.extractTier(invoice.lines.data[0], this.tiers).then(
      (tierId) =>
        this.subscriptionService.create(userId, tierId).then((r) => this.creditAdditionHandler(r)),
      (error) => this.errorHandler('create')(error)
    );
  }

  private renewHandler(invoice: Stripe.Invoice, userId: UserId): Promise<void> {
    return this.extractTier(invoice.lines.data[0], this.tiers).then(
      (tierId) =>
        this.subscriptionService.renew(userId, tierId).then((r) => this.creditAdditionHandler(r)),
      (error) => this.errorHandler('renew')(error)
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
      this.extractTier(previousTierInvoiceLineItem, this.tiers),
      this.extractTier(currentTierInvoiceLineItem, this.tiers)
    ]).then(([previousTier, currentTier]) => ({
      previousTier,
      currentTier
    }));
  }

  private executeSubscriptionUpdate(
    userId: UserId,
    invoice: Stripe.Invoice,
    tiers: { previousTier: TierId; currentTier: TierId },
    updateType: 'upgrade' | 'downgrade'
  ): Promise<void> {
    return match(updateType)
      .with('upgrade', () => {
        const period = invoice.lines.data[0].period;
        return this.subscriptionService
          .upgrade(
            userId,
            tiers.previousTier,
            tiers.currentTier,
            period,
            invoice.created as UnixTimestamp
          )
          .then(
            () => {},
            (e) => this.errorHandler('upgrade')(e)
          );
      })
      .with('downgrade', () =>
        this.subscriptionService
          .downgrade(userId)
          .catch((error) => this.errorHandler('downgrade')(error))
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
    operation: 'create' | 'renew' | 'upgrade' | 'downgrade'
  ): (error: unknown) => Promise<never> {
    return this.handleError(operation);
  }

  private extractTier(invoiceItem: Stripe.InvoiceLineItem, tiers: Tiers): Promise<TierId> {
    const priceId = invoiceItem?.pricing?.price_details?.price;
    if (!priceId) {
      return Promise.reject(
        new Error(
          `No price ID found in invoice line item. Invoice item ID: ${invoiceItem?.id || 'unknown'}`
        )
      );
    }
    const tier = Object.values(tiers).find((tier) => tier.priceId === priceId);
    if (!tier) {
      return Promise.reject(
        new Error(
          `Unknown price ID: ${priceId}. No matching tier found. Invoice item ID: ${invoiceItem.id}`
        )
      );
    }
    return Promise.resolve(tier.id);
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