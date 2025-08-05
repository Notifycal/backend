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

  protected calculateCurrentPlanPaidPercentageFromInvoice(
    invoice: Stripe.Invoice
  ): Promise<Percentage> {
    const totalPaidInCents = invoice.total;
    const currentPlanLineItem = invoice.lines.data.find((item) => item.amount > 0);
    if (!currentPlanLineItem) {
      return Promise.reject(new Error('Could not find current plan line item in invoice'));
    }
    let fullPlanAmountInCents: number | undefined;
    if (!fullPlanAmountInCents && 'plan' in currentPlanLineItem && currentPlanLineItem.plan) {
      fullPlanAmountInCents = (currentPlanLineItem.plan as Stripe.Plan).amount || undefined;
    }
    if (!fullPlanAmountInCents) {
      return Promise.reject(new Error('Could not determine full plan amount from invoice'));
    }
    console.log();
    return Promise.resolve(
      calculateRemainingPercentageFromAmounts(totalPaidInCents, fullPlanAmountInCents)
    );
  }
}
