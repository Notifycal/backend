/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { TierId, Tiers } from '@model/PaymentPlans';
import type { Identity, IdpName } from '@notifycal/shared/types';
import type { CreditAdditionResult } from '@services/credits-service';
import type { SubscriptionService } from '@services/subscription-service';
import type Stripe from 'stripe';
import { match } from 'ts-pattern';
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

export class InvoicePaymentSucceededHandler
  implements EventHandler<Stripe.InvoicePaymentSucceededEvent>
{
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

    return this.extractTier(invoice, this.tiers).then((tierId) =>
      match(invoice)
        .with({ billing_reason: 'subscription_create' }, () =>
          this.subscriptionService
            .createSubscription(identity.userId, tierId)
            .then((r) => this.subscriptionHandler(r))
        )
        .with({ billing_reason: 'subscription_cycle' }, () =>
          this.subscriptionService
            .renewSubscription(identity.userId, tierId)
            .then((r) => this.subscriptionHandler(r))
        )
        .otherwise((invoice) => {
          this.logger.warn('Unhandled billing reason', {
            invoiceId: invoice.id,
            billingReason: invoice.billing_reason
          });
          return Promise.resolve();
        })
    );
  }

  private subscriptionHandler(result: CreditAdditionResult): Promise<void> {
    return (
      match(result)
        .with({ operationId: 'Success' }, () => Promise.resolve())
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        .with({ operationId: 'UnknownError' }, (r) => Promise.reject(r.error))
        .exhaustive()
    );
  }

  private extractTier(invoice: Stripe.Invoice, tiers: Tiers): Promise<TierId> {
    const priceId = invoice.lines.data[0].pricing?.price_details?.price;
    const tier = Object.values(tiers).find((tier) => tier.priceId === priceId);
    if (!tier) {
      return Promise.reject(new Error(`Unknown price ID: ${priceId}. No matching tier found.`));
    }
    return Promise.resolve(tier.id);
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
