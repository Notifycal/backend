import console from 'console';
import Stripe from 'stripe'; // from package.json recently npm-installed "stripe": "^18.2.0",
import { beforeAll, describe, expect, it } from 'vitest';

describe('Stripe Test Clock Bug Demonstration', () => {
  let stripe: Stripe;

  const INVOICE_PAYMENT_SUCCEEDED_EVENT_ID = process.env.INVOICE_PAYMENT_SUCCEEDED_EVENT_ID!;

  beforeAll(() => {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-07-30.basil'
    });
  });

  it('should demonstrate that created.gte filter fails with Test Clock after renewal', async () => {
    // ===========================
    // CONFIGURATION - REPLACE THIS WITH YOUR ACTUAL SUBSCRIPTION ID
    // ===========================

    console.log('\n=====================================');
    console.log('STRIPE TEST CLOCK BUG DEMONSTRATION');
    console.log('=====================================\n');

    // Step 1: Get the most recent invoice for this subscription (the upgrade invoice)
    console.log('Step 1: Fetching most recent invoice (upgrade) for subscription...\n');

    const invoicePaymentSucceededUpgrade = await stripe.events.retrieve(
      INVOICE_PAYMENT_SUCCEEDED_EVENT_ID
    );

    const upgradeInvoice = invoicePaymentSucceededUpgrade.data.object as Stripe.Invoice;
    const subscriptionId = extractSubscriptionIdFromInvoice(upgradeInvoice);

    console.log('Invoice ID:', upgradeInvoice.id);
    console.log('Billing Reason:', upgradeInvoice.billing_reason);
    console.log('Customer ID:', upgradeInvoice.customer);
    console.log(
      'Invoice Created:',
      upgradeInvoice.created,
      `(${new Date(upgradeInvoice.created * 1000).toISOString()})`
    );

    // Step 2: Extract period dates following YOUR EXACT LOGIC
    console.log('\n-----------------------------------');
    console.log('Step 2: Extracting period dates using YOUR webhook logic...\n');

    // Find the current plan line item (amount > 0) - following your logic
    const currentPlanLineItem = upgradeInvoice.lines.data.find((item) => item.amount > 0);

    expect(currentPlanLineItem).toBeDefined();

    // Extract periods exactly as your code does
    const periodStart = upgradeInvoice.period_start;
    const periodEnd = currentPlanLineItem!.period.end;
    const customerId = upgradeInvoice.customer as string;

    console.log('🔍 Period boundaries (from your logic):');
    console.log(
      `   periodStart: ${periodStart} (${new Date(periodStart * 1000).toISOString()}) [from invoice.period_start]`
    );
    console.log(
      `   periodEnd:   ${periodEnd} (${new Date(periodEnd * 1000).toISOString()}) [from currentPlanLineItem.period.end]`
    );
    console.log(`   Customer ID: ${customerId}`);
    console.log(`   Subscription ID: ${subscriptionId}`);

    // Step 3: Query WITHOUT created filter (this works)
    console.log('\n-----------------------------------');
    console.log('Step 3: Querying ALL invoices WITHOUT created filter...\n');

    const invoicesWithoutFilter = await stripe.invoices.list({
      customer: customerId,
      subscription: subscriptionId,
      status: 'paid',
      limit: 100
    });

    console.log(`✅ Found ${invoicesWithoutFilter.data.length} paid invoices WITHOUT filter:\n`);

    let invoicesInPeriodCount = 0;
    const expectedInvoiceIds: Array<string> = [];

    invoicesWithoutFilter.data.forEach((invoice, index) => {
      const isInPeriod = invoice.created >= periodStart && invoice.created <= periodEnd;

      console.log(`  Invoice ${index + 1}: ${invoice.id}`);
      console.log(
        `    Created:        ${invoice.created} (${new Date(invoice.created * 1000).toISOString()})`
      );
      console.log(
        `    Period:         ${new Date(invoice.period_start * 1000).toISOString()} to ${new Date(invoice.period_end * 1000).toISOString()}`
      );
      console.log(`    Billing Reason: ${invoice.billing_reason}`);
      console.log(`    Amount Paid:    ${invoice.amount_paid / 100} EUR`);
      console.log(`    Status:         ${invoice.status}`);

      if (isInPeriod) {
        console.log(
          `    ✅ IN PERIOD: created (${invoice.created}) is between [${periodStart}, ${periodEnd}]`
        );
        invoicesInPeriodCount++;
        expectedInvoiceIds.push(invoice.id);
      } else {
        console.log(
          `    ❌ OUT OF PERIOD: created (${invoice.created}) is NOT between [${periodStart}, ${periodEnd}]`
        );
      }
      console.log('');
    });

    console.log(
      `\n📊 Summary: ${invoicesInPeriodCount} invoices SHOULD be returned when filtering by created`
    );
    console.log(`   Expected invoice IDs: ${expectedInvoiceIds.join(', ')}`);

    // Step 4: Query WITH created filter (this SHOULD work but doesn't)
    console.log('\n-----------------------------------');
    console.log('Step 4: Querying invoices WITH created filter (following your logic)...\n');

    console.log('🔍 Using filter:');
    console.log(`   customer:    "${customerId}"`);
    console.log(`   subscription: "${subscriptionId}"`);
    console.log(`   status:      "paid"`);
    console.log(`   created.gte: ${periodStart} (${new Date(periodStart * 1000).toISOString()})`);
    console.log(`   created.lte: ${periodEnd} (${new Date(periodEnd * 1000).toISOString()})\n`);

    const invoicesWithFilter = await stripe.invoices.list({
      customer: customerId,
      subscription: subscriptionId,
      status: 'paid',
      created: {
        gte: periodStart,
        lte: periodEnd
      },
      limit: 100
    });

    console.log(`❌ Found ${invoicesWithFilter.data.length} invoices WITH created filter\n`);

    if (invoicesWithFilter.data.length === 0) {
      console.log('   ⚠️  NO INVOICES RETURNED - THIS IS THE BUG!\n');
      console.log('   The query with created filter returned 0 results even though:');
      console.log(
        `   - There are ${invoicesInPeriodCount} invoices with created timestamps in the range`
      );
      console.log(`   - The timestamps are clearly within [${periodStart}, ${periodEnd}]`);
    } else {
      invoicesWithFilter.data.forEach((invoice) => {
        console.log(`   - ${invoice.id}: created at ${invoice.created}`);
      });
    }

    // Step 5: Additional isolation tests
    console.log('\n-----------------------------------');
    console.log('Step 5: Isolation tests to confirm the bug...\n');

    // Test A: Only gte
    const testGte = await stripe.invoices.list({
      customer: customerId,
      subscription: subscriptionId,
      created: { gte: periodStart },
      limit: 100
    });
    console.log(
      `Test A - Only created.gte: ${testGte.data.length} invoices ${testGte.data.length === 0 ? '❌ (FAILS)' : '✅'}`
    );

    // Test B: Only lte
    const testLte = await stripe.invoices.list({
      customer: customerId,
      subscription: subscriptionId,
      created: { lte: periodEnd },
      limit: 100
    });
    console.log(
      `Test B - Only created.lte: ${testLte.data.length} invoices ${testLte.data.length > 0 ? '✅ (WORKS)' : '❌'}`
    );

    // Test C: Wide range with past timestamp
    const testWide = await stripe.invoices.list({
      customer: customerId,
      subscription: subscriptionId,
      created: { gte: 1, lte: 2000000000 },
      limit: 100
    });
    console.log(
      `Test C - Wide range (1 to 2033): ${testWide.data.length} invoices ${testWide.data.length > 0 ? '✅ (WORKS)' : '❌'}`
    );

    // Test D: Without subscription filter
    const testNoSub = await stripe.invoices.list({
      customer: customerId,
      created: {
        gte: periodStart,
        lte: periodEnd
      },
      limit: 100
    });
    console.log(
      `Test D - Without subscription filter: ${testNoSub.data.length} invoices ${testNoSub.data.length === 0 ? '❌ (ALSO FAILS)' : '✅'}`
    );

    // Step 6: Verify test clock is being used
    console.log('\n-----------------------------------');
    console.log('Step 6: Test Clock verification...\n');

    if (upgradeInvoice.test_clock) {
      console.log(`✅ Using Test Clock: ${upgradeInvoice.test_clock}`);
      console.log('   This confirms the bug occurs with Test Clocks');
    } else {
      console.log('⚠️  No Test Clock detected - this test should be run with a Test Clock');
    }

    // Step 7: Final assertions
    console.log('\n=====================================');
    console.log('FINAL RESULTS');
    console.log('=====================================\n');

    console.log(`Expected invoices (should be in period): ${invoicesInPeriodCount}`);
    console.log(`Actual invoices returned with filter:    ${invoicesWithFilter.data.length}`);

    // The actual test assertions
    expect(invoicesInPeriodCount, 'There should be invoices in the current period').toBeGreaterThan(
      0
    );

    // This assertion will FAIL due to the Stripe bug
    try {
      expect(
        invoicesWithFilter.data,
        'The created filter should return the same invoices that are in the period'
      ).toHaveLength(invoicesInPeriodCount);

      console.log('\n✅ TEST PASSED: No bug detected - filter is working correctly');
    } catch (error) {
      console.log('\n🐛 BUG CONFIRMED: created.gte filter returns 0 results with Test Clock!');
      console.log('\nThis is a Stripe API bug where:');
      console.log('1. The created.gte filter fails with Test Clock future timestamps');
      console.log('2. The same query without created filter works correctly');
      console.log('3. The created.lte filter works, but created.gte does not');

      // Re-throw to make the test fail and show the bug
      throw error;
    }
  });
});

/**
 * To run this test:
 *
 * 1. Set up your test data:
 *    - Create a subscription with Test Clock in Stripe
 *    - Advance time to trigger a renewal
 *    - Perform an upgrade
 *    - Note the invoice.payment_succeeded event ID
 *
 * 2. Configure the test:
 *    - Set INVOICE_PAYMENT_SUCCEEDED_EVENT_ID environment variable with your actual event ID
 *    - Set STRIPE_SECRET_KEY environment variable
 *
 * 3. Run the test:
 *    npm test -- stripe-invoice-list-created-bug.test.ts
 *    or
 *    STRIPE_SECRET_KEY=sk_test_... INVOICE_PAYMENT_SUCCEEDED_EVENT_ID='evt_erg...' npm test
 *
 * Expected result: The test will FAIL, demonstrating the bug
 */

function extractSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string {
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
