import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { BaseHandler } from './base-handler';

describe(BaseHandler, () => {
  const createValidLineItem = (amount: number, planAmount: number): Stripe.InvoiceLineItem =>
    ({
      id: `il_test_${Math.random()}`,
      amount,
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
    total: number,
    previousPlanAmount: number,
    currentPlanAmount: number
  ): Stripe.Invoice =>
    ({
      id: `in_test_${Math.random()}`,
      total,
      lines: {
        data: [
          createValidLineItem(-Math.abs(previousPlanAmount), previousPlanAmount), // Previous plan refund (negative amount)
          createValidLineItem(currentPlanAmount, currentPlanAmount) // Current plan charge
        ]
      }
    }) as Stripe.Invoice;

  describe('calculateCurrentPlanPaidPercentageFromInvoice', () => {
    it('calculates how much of new tier is covered when customer upgrades from good to better', async () => {
      // Customer originally paid €10 (good tier), now upgrading to €25 (better tier)
      // Stripe automatically calculates: €10 refund (unused portion) + €15 prorated charge (remaining cycle)
      // Total customer contribution: €10 (already paid) + €10 (refund credit) + €15 (prorated new tier) = €25
      const validInvoice = createValidInvoice(1500, 1000, 2500);

      const result = await testCalculateCurrentPlanPaidPercentageFromInvoice(validInvoice);

      // Total customer contribution (€25) covers 100% of new tier cost (€25)
      expect(result).toBe(100);
    });

    it('calculates how much of new tier is covered when customer upgrades from better to best', async () => {
      // Customer originally paid €25 (better tier), now upgrading to €60 (best tier)
      // Stripe automatically calculates: €1 refund (small unused portion) + €36 prorated charge (remaining cycle)
      // Total customer contribution: €25 (already paid) + €1 (refund credit) + €36 (prorated new tier) = €37
      const validInvoice = createValidInvoice(3600, 100, 6000);

      const result = await testCalculateCurrentPlanPaidPercentageFromInvoice(validInvoice);

      // Total customer contribution (€37) covers 61.67% of new tier cost (€60)
      expect(result).toBe(61.66667);
    });

    it('calculates how much of new tier is covered when customer upgrades from good to best with prorated refund', async () => {
      // Customer originally paid €10 (good tier), now upgrading to €60 (best tier)
      // Stripe automatically calculates: €5 refund (half month unused) + €55 prorated charge (remaining cycle)
      // Total customer contribution: €10 (already paid) + €5 (refund credit) + €55 (prorated new tier) = €60
      const validInvoice = createValidInvoice(5500, 500, 6000);

      const result = await testCalculateCurrentPlanPaidPercentageFromInvoice(validInvoice);

      // Total customer contribution (€60) covers 100% of new tier cost (€60)
      expect(result).toBe(100);
    });

    it('rejects when invoice is missing the new tier line item', async () => {
      const invalidInvoice = {
        id: 'in_test_invalid',
        total: 1500,
        lines: {
          data: [createValidLineItem(-1000, 1000)] // Only refund from previous tier
        }
      } as Stripe.Invoice;

      await expect(
        testCalculateCurrentPlanPaidPercentageFromInvoice(invalidInvoice)
      ).rejects.toThrow('Could not find current plan line item in invoice');
    });

    it('rejects when invoice is missing the previous tier refund line item', async () => {
      const invalidInvoice = {
        id: 'in_test_invalid',
        total: 2500,
        lines: {
          data: [createValidLineItem(2500, 2500)] // Only new tier charge, no previous tier refund
        }
      } as Stripe.Invoice;

      await expect(
        testCalculateCurrentPlanPaidPercentageFromInvoice(invalidInvoice)
      ).rejects.toThrow('Could not find previous plan line item in invoice');
    });

    it('rejects when new tier line item has no pricing information', async () => {
      const invalidInvoice = {
        id: 'in_test_invalid',
        total: 1500,
        lines: {
          data: [
            createValidLineItem(-1000, 1000), // Previous tier refund (good tier)
            createInvalidLineItem(2500) // New tier without pricing info (better tier)
          ]
        }
      } as Stripe.Invoice;

      await expect(
        testCalculateCurrentPlanPaidPercentageFromInvoice(invalidInvoice)
      ).rejects.toThrow('Could not determine current plan amount from invoice');
    });

    it('rejects when previous tier refund has no pricing information', async () => {
      const invalidInvoice = {
        id: 'in_test_invalid',
        total: 1500,
        lines: {
          data: [
            createInvalidLineItem(-1000), // Previous tier refund without pricing info (good tier)
            createValidLineItem(2500, 2500) // New tier charge (better tier)
          ]
        }
      } as Stripe.Invoice;

      await expect(
        testCalculateCurrentPlanPaidPercentageFromInvoice(invalidInvoice)
      ).rejects.toThrow('Could not determine previous plan amount from invoice');
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
    super('invoice.payment_succeeded');
  }

  public testCalculateCurrentPlanPaidPercentageFromInvoice(invoice: Stripe.Invoice) {
    return this.calculateCurrentPlanPaidPercentageFromInvoice(invoice);
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

function testCalculateCurrentPlanPaidPercentageFromInvoice(invoice: Stripe.Invoice) {
  const handler = new TestableBaseHandler();
  return handler.testCalculateCurrentPlanPaidPercentageFromInvoice(invoice);
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
