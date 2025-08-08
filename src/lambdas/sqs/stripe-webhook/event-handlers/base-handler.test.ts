import { logger } from '@common/powertools';
import type { UnixTimestamp } from '@notifycal/shared/types';
import type { StripeService } from '@services/stripe';
import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { BaseHandler } from './base-handler';

describe(BaseHandler, () => {
  const createValidLineItem = (
    amount: number,
    planAmount: number,
    subscriptionId = 'sub_test_123',
    periodEnd = 1640995200 as UnixTimestamp
  ): Stripe.InvoiceLineItem =>
    ({
      id: `il_test_${Math.random()}`,
      amount,
      subscription: subscriptionId,
      period: {
        end: periodEnd
      },
      plan: {
        amount: planAmount
      } as Stripe.Plan
    }) as unknown as Stripe.InvoiceLineItem;

  const createValidLineItemWithSubscriptionObject = (
    amount: number,
    planAmount: number,
    subscriptionId = 'sub_test_123',
    periodEnd = 1640995200 as UnixTimestamp
  ): Stripe.InvoiceLineItem =>
    ({
      id: `il_test_${Math.random()}`,
      amount,
      subscription: { id: subscriptionId } as Stripe.Subscription,
      period: {
        end: periodEnd
      },
      plan: {
        amount: planAmount
      } as Stripe.Plan
    }) as unknown as Stripe.InvoiceLineItem;

  const createInvalidLineItem = (amount: number): Stripe.InvoiceLineItem =>
    ({
      id: `il_test_${Math.random()}`,
      amount
    }) as Stripe.InvoiceLineItem;

  const createValidInvoice = (
    lineItems: Array<Stripe.InvoiceLineItem>,
    periodStart = 1640908800 as UnixTimestamp
  ): Stripe.Invoice =>
    ({
      id: `in_test_${Math.random()}`,
      // eslint-disable-next-line camelcase
      period_start: periodStart,
      lines: {
        data: lineItems
      }
    }) as unknown as Stripe.Invoice;

  describe('totalPaidInBillingCycleWithRespectToCurrentPlan', () => {
    it('calculates 100% when customer has paid exactly the current plan amount', async () => {
      // Customer has paid exactly €25 for a €25 premium plan
      const currentPlanLineItem = createValidLineItem(2500, 2500);
      const validInvoice = createValidInvoice([currentPlanLineItem]);
      const totalPaidInSubscriptionInvoicesWithinPeriodFn = vi.fn(() => Promise.resolve(2500));

      const result = await testTotalPaidInSubscriptionInvoicesWithinBillingCycle(
        validInvoice,
        totalPaidInSubscriptionInvoicesWithinPeriodFn
      );

      expect(result).toBe(100);
      expect(totalPaidInSubscriptionInvoicesWithinPeriodFn).toHaveBeenCalledWith(
        'sub_test_123',
        1640908800,
        1640995200
      );
    });

    it('calculates 100% when customer has paid exactly the current plan amount due to prorated billing', async () => {
      // In Stripe's prorated billing, the customer will never pay more than the plan amount
      // This test simulates the exact payment scenario
      const currentPlanLineItem = createValidLineItem(2500, 2500);
      const validInvoice = createValidInvoice([currentPlanLineItem]);
      const totalPaidInSubscriptionInvoicesWithinPeriodFn = vi.fn(() => Promise.resolve(2500));

      const result = await testTotalPaidInSubscriptionInvoicesWithinBillingCycle(
        validInvoice,
        totalPaidInSubscriptionInvoicesWithinPeriodFn
      );

      expect(result).toBe(100);
    });

    it('calculates correct percentage for multi-upgrade scenario matching comment example', async () => {
      // Simulates: Day 1: €10, Day 2: €14.51 + €33.87 = €58.38 total of €60 enterprise plan
      // Expected: 58.38/60 = 97.3% (matching the comment example)
      const currentPlanLineItem = createValidLineItem(6000, 6000); // €60 enterprise plan
      const validInvoice = createValidInvoice([currentPlanLineItem]);
      const totalPaidInSubscriptionInvoicesWithinPeriodFn = vi.fn(() => Promise.resolve(5838)); // €58.38

      const result = await testTotalPaidInSubscriptionInvoicesWithinBillingCycle(
        validInvoice,
        totalPaidInSubscriptionInvoicesWithinPeriodFn
      );

      expect(result).toBe(97.3);
    });

    it('handles subscription ID as string correctly', async () => {
      const currentPlanLineItem = createValidLineItem(2500, 2500, 'sub_string_123');
      const validInvoice = createValidInvoice([currentPlanLineItem]);
      const totalPaidInSubscriptionInvoicesWithinPeriodFn = vi.fn(() => Promise.resolve(2500));

      const result = await testTotalPaidInSubscriptionInvoicesWithinBillingCycle(
        validInvoice,
        totalPaidInSubscriptionInvoicesWithinPeriodFn
      );

      expect(result).toBe(100);
      expect(totalPaidInSubscriptionInvoicesWithinPeriodFn).toHaveBeenCalledWith(
        'sub_string_123',
        1640908800,
        1640995200
      );
    });

    it('handles subscription ID as Stripe.Subscription object correctly', async () => {
      const currentPlanLineItem = createValidLineItemWithSubscriptionObject(
        2500,
        2500,
        'sub_object_123'
      );
      const validInvoice = createValidInvoice([currentPlanLineItem]);
      const totalPaidInSubscriptionInvoicesWithinPeriodFn = vi.fn(() => Promise.resolve(2500));

      const result = await testTotalPaidInSubscriptionInvoicesWithinBillingCycle(
        validInvoice,
        totalPaidInSubscriptionInvoicesWithinPeriodFn
      );

      expect(result).toBe(100);
      expect(totalPaidInSubscriptionInvoicesWithinPeriodFn).toHaveBeenCalledWith(
        'sub_object_123',
        1640908800,
        1640995200
      );
    });

    it('rejects when invoice has no line items', async () => {
      const invalidInvoice = createValidInvoice([]);
      const totalPaidInSubscriptionInvoicesWithinPeriodFn = vi.fn(() => Promise.resolve(2500));

      await expect(
        testTotalPaidInSubscriptionInvoicesWithinBillingCycle(
          invalidInvoice,
          totalPaidInSubscriptionInvoicesWithinPeriodFn
        )
      ).rejects.toThrow('Invoice has no line items');
    });

    it('rejects when line item has no subscription ID', async () => {
      const invalidLineItem = {
        id: 'il_test_invalid',
        amount: 2500,
        subscription: null,
        period: { end: 1640995200 },
        plan: { amount: 2500 }
      } as unknown as Stripe.InvoiceLineItem;
      const invalidInvoice = createValidInvoice([invalidLineItem]);
      const totalPaidInSubscriptionInvoicesWithinPeriodFn = vi.fn(() => Promise.resolve(2500));

      await expect(
        testTotalPaidInSubscriptionInvoicesWithinBillingCycle(
          invalidInvoice,
          totalPaidInSubscriptionInvoicesWithinPeriodFn
        )
      ).rejects.toThrow('Could not extract subscription ID from invoice line item');
    });

    it('rejects when no positive amount line item is found', async () => {
      const negativeLineItem = createValidLineItem(-1000, 1000);
      const zeroLineItem = createValidLineItem(0, 2500);
      const invalidInvoice = createValidInvoice([negativeLineItem, zeroLineItem]);
      const totalPaidInSubscriptionInvoicesWithinPeriodFn = vi.fn(() => Promise.resolve(2500));

      await expect(
        testTotalPaidInSubscriptionInvoicesWithinBillingCycle(
          invalidInvoice,
          totalPaidInSubscriptionInvoicesWithinPeriodFn
        )
      ).rejects.toThrow('Could not find current plan line item in invoice');
    });

    it('rejects when current plan line item has no pricing information', async () => {
      const invalidLineItem = {
        ...createInvalidLineItem(2500),
        subscription: 'sub_test_123',
        period: { end: 1640995200 }
      } as unknown as Stripe.InvoiceLineItem;
      const invalidInvoice = createValidInvoice([invalidLineItem]);
      const totalPaidInSubscriptionInvoicesWithinPeriodFn = vi.fn(() => Promise.resolve(2500));

      await expect(
        testTotalPaidInSubscriptionInvoicesWithinBillingCycle(
          invalidInvoice,
          totalPaidInSubscriptionInvoicesWithinPeriodFn
        )
      ).rejects.toThrow('Could not determine current plan amount from invoice');
    });

    it('rejects when StripeService throws an error', async () => {
      const currentPlanLineItem = createValidLineItem(2500, 2500);
      const validInvoice = createValidInvoice([currentPlanLineItem]);
      const totalPaidInSubscriptionInvoicesWithinPeriodFn = vi.fn(() =>
        Promise.reject(new Error('Stripe API error'))
      );

      await expect(
        testTotalPaidInSubscriptionInvoicesWithinBillingCycle(
          validInvoice,
          totalPaidInSubscriptionInvoicesWithinPeriodFn
        )
      ).rejects.toThrow('Stripe API error');
    });
  });

  describe('extractSubscriptionIdFromInvoice', () => {
    it('extracts subscription ID when subscription is a string', () => {
      const lineItem = createValidLineItem(2500, 2500, 'sub_string_123');
      const validInvoice = createValidInvoice([lineItem]);

      const result = testExtractSubscriptionIdFromInvoice(validInvoice);

      expect(result).toBe('sub_string_123');
    });

    it('extracts subscription ID when subscription is a Stripe.Subscription object', () => {
      const lineItem = createValidLineItemWithSubscriptionObject(2500, 2500, 'sub_object_123');
      const validInvoice = createValidInvoice([lineItem]);

      const result = testExtractSubscriptionIdFromInvoice(validInvoice);

      expect(result).toBe('sub_object_123');
    });

    it('throws error when invoice has no line items', () => {
      const invalidInvoice = createValidInvoice([]);

      expect(() => testExtractSubscriptionIdFromInvoice(invalidInvoice)).toThrow(
        'Invoice has no line items'
      );
    });

    it('throws error when line item has no subscription', () => {
      const invalidLineItem = {
        id: 'il_test_invalid',
        amount: 2500,
        subscription: null,
        period: { end: 1640995200 },
        plan: { amount: 2500 }
      } as unknown as Stripe.InvoiceLineItem;
      const invalidInvoice = createValidInvoice([invalidLineItem]);

      expect(() => testExtractSubscriptionIdFromInvoice(invalidInvoice)).toThrow(
        'Could not extract subscription ID from invoice line item'
      );
    });
  });

  describe('findAndValidateLineItem', () => {
    const validItems = [
      createValidLineItem(-1000, 1000), // Previous tier refund (good tier)
      createValidLineItem(2500, 2500) // New tier charge (better tier)
    ];

    it('finds and returns the line item matching the criteria', () => {
      const result = testFindAndValidateLineItem(validItems, (item) => item.amount > 0, 'current');

      expect(result.amount).toBe(2500);
    });

    it('throws error when no line item matches the search criteria', () => {
      expect(() =>
        testFindAndValidateLineItem(validItems, (item) => item.amount === 0, 'zero-amount')
      ).toThrow('Could not find zero-amount plan line item in invoice');
    });
  });

  describe('extractAndValidatePlanAmount', () => {
    it('extracts the tier price from a valid line item', () => {
      const validLineItem = createValidLineItem(2500, 2500); // Better tier

      const result = testExtractAndValidatePlanAmount(validLineItem, 'current');

      expect(result).toBe(2500);
    });

    it('throws error when line item has no tier pricing information', () => {
      const invalidLineItem = createInvalidLineItem(2500); // Better tier without pricing info

      expect(() => testExtractAndValidatePlanAmount(invalidLineItem, 'current')).toThrow(
        'Could not determine current plan amount from invoice'
      );
    });

    it('throws error when tier pricing information is null/undefined', () => {
      const lineItemWithNullAmount = {
        id: 'il_test_null',
        amount: 6000, // Best tier
        plan: {
          amount: null
        }
      } as unknown as Stripe.InvoiceLineItem;

      expect(() => testExtractAndValidatePlanAmount(lineItemWithNullAmount, 'current')).toThrow(
        'Could not determine current plan amount from invoice'
      );
    });
  });
});

class TestableBaseHandler extends BaseHandler {
  public constructor() {
    super('invoice.payment_succeeded', logger);
  }

  public totalPaidInSubscriptionInvoicesWithinBillingCycle(
    invoice: Stripe.Invoice,
    stripeService: StripeService
  ) {
    return this.totalPaidInBillingCycleWithRespectToCurrentPlan(invoice, stripeService);
  }

  public testExtractSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
    return this.extractSubscriptionIdFromInvoice(invoice);
  }

  public testFindAndValidateLineItem(
    items: Array<Stripe.InvoiceLineItem>,
    predicate: (item: Stripe.InvoiceLineItem) => boolean,
    itemType: string
  ) {
    return this.findAndValidateLineItem(items, predicate, itemType);
  }

  public testExtractAndValidatePlanAmount(lineItem: Stripe.InvoiceLineItem, itemType: string) {
    return this.extractAndValidatePlanAmount(lineItem, itemType);
  }
}

function testTotalPaidInSubscriptionInvoicesWithinBillingCycle(
  invoice: Stripe.Invoice,
  totalPaidInSubscriptionInvoicesWithinBillingCycleFn: () => Promise<number>
) {
  const stripeServiceMock = {
    totalPaidInSubscriptionInvoicesWithinBillingCycle:
      totalPaidInSubscriptionInvoicesWithinBillingCycleFn
  } as unknown as StripeService;

  const handler = new TestableBaseHandler();
  return handler.totalPaidInSubscriptionInvoicesWithinBillingCycle(invoice, stripeServiceMock);
}

function testExtractSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const handler = new TestableBaseHandler();
  return handler.testExtractSubscriptionIdFromInvoice(invoice);
}

function testFindAndValidateLineItem(
  items: Array<Stripe.InvoiceLineItem>,
  predicate: (item: Stripe.InvoiceLineItem) => boolean,
  itemType: string
) {
  const handler = new TestableBaseHandler();
  return handler.testFindAndValidateLineItem(items, predicate, itemType);
}

function testExtractAndValidatePlanAmount(lineItem: Stripe.InvoiceLineItem, itemType: string) {
  const handler = new TestableBaseHandler();
  return handler.testExtractAndValidatePlanAmount(lineItem, itemType);
}
