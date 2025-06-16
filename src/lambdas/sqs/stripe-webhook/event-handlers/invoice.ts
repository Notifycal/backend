import type { Logger } from '@aws-lambda-powertools/logger';
import type { TierId, Tiers } from '@model/PaymentPlans';
import type { Identity, IdpName } from '@notifycal/shared/types';
import { throwError } from '@services/common/error-handling';
import type Stripe from 'stripe';
import type { SubscriptionService } from '../../../../services/subscription-service';
import type { EventHandler } from './common';

export class InvoiceCreatedHandler implements EventHandler<Stripe.InvoiceCreatedEvent> {
  public constructor(private readonly logger: Logger) {}

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

export class InvoicePaymentSucceededHandler implements EventHandler<Stripe.InvoicePaymentSucceededEvent> {
  public constructor(
    private readonly logger: Logger,
    private readonly subscriptionService: SubscriptionService<IdpName>,
    private readonly tiers: Tiers
  ) {}

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

    const tierId = this.extractTier(invoice, this.tiers);

    if (invoice.billing_reason === 'subscription_create') {
      return this.subscriptionService.createSubscription(identity.userId, tierId);
    } else if (invoice.billing_reason === 'subscription_cycle') {
      return this.subscriptionService.renewSubscription(identity.userId, tierId);
    } else {
      this.logger.error('Unhandled billing reason for invoice payment succeeded', {
        invoiceId: invoice.id,
        billingReason: invoice.billing_reason
      });
      throwError('Unhandled billing reason');
    }
  }

  private extractTier(invoice: Stripe.Invoice, tiers: Tiers): TierId {
    const priceId = invoice.lines.data[0].pricing?.price_details?.price;
    const tier = Object.values(tiers).find((tier) => tier.priceId === priceId);
    if (!tier) {
      throw new Error(`Unknown price ID: ${priceId}. No matching tier found.`);
    }
    return tier.id;
  }
}

export class InvoicePaymentFailedHandler implements EventHandler<Stripe.InvoicePaymentFailedEvent> {
  public constructor(private readonly logger: Logger) {}

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
