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

  protected calculateRemainingCyclePercentageFromInvoice(
    invoice: Stripe.Invoice
  ): Promise<Percentage> {
    const previousPlanLineItem = invoice.lines.data.find((item) => item.amount < 0);
    if (!previousPlanLineItem) {
      return Promise.reject(new Error('Could not find previous plan line item in invoice'));
    }
    const creditAmount = Math.abs(previousPlanLineItem.amount);
    let fullPlanAmount: number | undefined;
    if (!fullPlanAmount && 'plan' in previousPlanLineItem && previousPlanLineItem.plan) {
      fullPlanAmount = (previousPlanLineItem.plan as Stripe.Plan).amount || undefined;
    }
    if (!fullPlanAmount) {
      return Promise.reject(new Error('Could not determine full plan amount from invoice'));
    }
    return Promise.resolve(calculateRemainingPercentageFromAmounts(creditAmount, fullPlanAmount));
  }
}
