import type { Percentage, UnixTimestamp } from '@notifycal/shared/types';
import type { StripeService } from '@services/stripe';
import { calculateRemainingPercentageFromAmounts } from '@utils/maths';
import { promiseTry } from '@utils/promises';
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

  protected extractSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string {
    const firstLineItem = invoice.lines.data[0];
    if (!firstLineItem) {
      throw new Error('Invoice has no line items');
    }
    const subscription = firstLineItem.subscription;
    if (!subscription) {
      throw new Error('Could not extract subscription ID from invoice line item');
    }
    return typeof subscription === 'string' ? subscription : subscription.id;
  }

  /**
  Calculates what percentage of the current plan (latest upgrade) has been covered
  by all accumulated payments since the subscription's creation/renewal(current billing cycle), including any upgrades.
  
  This method accounts for Stripe's automatic prorated billing when customers upgrade
  their subscriptions mid-cycle. For example:
  - Day 1: Customer pays 10e for basic plan
  - Day 2: Customer upgrades to premium (25e), pays 14.51e prorated amount
  - Same day: Customer upgrades to enterprise (60e), pays 33.87e prorated amount
  - Total paid: e58.87 of 60e enterprise plan = 97.3%
  
  Due to Stripe's prorated billing, the percentage will always be ≤100% of the current plan cost.
  
  @param invoice - The Stripe invoice containing line items with current plan information
  @param stripeService - Service to fetch total payments within the billing period
  @returns Promise<Percentage> - Percentage (0-100) of current plan cost covered by payments
 **/
  protected totalPaidInBillingCycleWithRespectToCurrentPlan(
    invoice: Stripe.Invoice,
    stripeService: StripeService
  ): Promise<Percentage> {
    return promiseTry(() => {
      const subscriptionId = this.extractSubscriptionIdFromInvoice(invoice);
      const currentPlanLineItem = this.findAndValidateLineItem(
        invoice.lines.data,
        (item) => item.amount > 0,
        'current'
      );
      const currentPlanAmount = this.extractAndValidatePlanAmount(currentPlanLineItem, 'current');

      return {
        periodStart: invoice.period_start as UnixTimestamp,
        periodEnd: currentPlanLineItem.period.end as UnixTimestamp,
        subscriptionId,
        currentPlanAmount
      };
    })
      .then(({ periodStart, periodEnd, subscriptionId, currentPlanAmount }) =>
        stripeService
          .totalPaidInSubscriptionInvoicesWithinPeriod(subscriptionId, periodStart, periodEnd)
          .then((totalPaidInCurrentBillingCycle) => ({
            totalPaidInCurrentBillingCycle,
            currentPlanAmount
          }))
      )
      .then(({ totalPaidInCurrentBillingCycle, currentPlanAmount }) =>
        calculateRemainingPercentageFromAmounts(totalPaidInCurrentBillingCycle, currentPlanAmount)
      );
  }
}
