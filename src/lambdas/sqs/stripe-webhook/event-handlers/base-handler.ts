import type { Percentage } from '@notifycal/shared/types';
import { calculateRemainingPercentageFromAmounts } from '@utils/maths';
import type Stripe from 'stripe';
import type { StripeEventType } from '../stripe-schemas';

export abstract class BaseHandler {
  protected constructor(protected readonly stripeEventType: StripeEventType) {}

  protected handleError(operation: string): (error: unknown) => Promise<never> {
    return (error: unknown) =>
      Promise.reject(
        new Error(
          `Error while handling ${operation} in ${this.stripeEventType} event handler. Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { cause: error }
        )
      );
  }

  protected extractPlanAmountFromLineItem(lineItem: Stripe.InvoiceLineItem): number | undefined {
    return 'plan' in lineItem && lineItem.plan
      ? (lineItem.plan as Stripe.Plan).amount || undefined
      : undefined;
  }

  protected findAndValidateLineItem(
    items: Array<Stripe.InvoiceLineItem>,
    predicate: (item: Stripe.InvoiceLineItem) => boolean,
    itemType: string
  ): Stripe.InvoiceLineItem {
    const lineItem = items.find(predicate);
    if (!lineItem) {
      throw new Error(`Could not find ${itemType} plan line item in invoice`);
    }
    return lineItem;
  }

  protected extractAndValidatePlanAmount(
    lineItem: Stripe.InvoiceLineItem,
    itemType: string
  ): number {
    const planAmount = this.extractPlanAmountFromLineItem(lineItem);
    if (!planAmount) {
      throw new Error(`Could not determine ${itemType} plan amount from invoice`);
    }
    return planAmount;
  }

  protected calculateCurrentPlanPaidPercentageFromInvoice(
    invoice: Stripe.Invoice
  ): Promise<Percentage> {
    return Promise.resolve().then(() => {
      const totalPaidInCents = invoice.total;
      const previousPlanLineItem = this.findAndValidateLineItem(
        invoice.lines.data,
        (item) => item.amount < 0,
        'previous'
      );
      const currentPlanLineItem = this.findAndValidateLineItem(
        invoice.lines.data,
        (item) => item.amount > 0,
        'current'
      );
      const currentPlanAmount = this.extractAndValidatePlanAmount(currentPlanLineItem, 'current');
      const previousPlanAmount = this.extractAndValidatePlanAmount(
        previousPlanLineItem,
        'previous'
      );
      return calculateRemainingPercentageFromAmounts(
        totalPaidInCents + previousPlanAmount,
        currentPlanAmount
      );
    });
  }
}
