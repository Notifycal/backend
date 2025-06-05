/* eslint-disable no-use-before-define */
import { logger } from '@common/powertools';
import { tap } from '@utils/promises';
import type Stripe from 'stripe';
import { match } from 'ts-pattern';
import type { StripeWebhookConfig } from './config';
import type { Record } from './schema';

export async function recordProcessor(record: Record, config: StripeWebhookConfig): Promise<void> {
  const stripeEvent = record.body.detail;
  logger.info('Processing Stripe webhook event', {
    eventId: stripeEvent.id,
    eventType: stripeEvent.type,
    livemode: stripeEvent.livemode,
    config
  });
  return match(stripeEvent)
    .with({ type: 'customer.created' }, (event) =>
      handleCustomerCreated(event as Stripe.CustomerCreatedEvent)
    )
    .with({ type: 'customer.updated' }, (event) =>
      handleCustomerUpdated(event as Stripe.CustomerUpdatedEvent)
    )
    .with({ type: 'customer.deleted' }, (event) =>
      handleCustomerDeleted(event as Stripe.CustomerDeletedEvent)
    )
    .with({ type: 'customer.subscription.created' }, (event) =>
      handleSubscriptionCreated(event as Stripe.CustomerSubscriptionCreatedEvent)
    )
    .with({ type: 'customer.subscription.updated' }, (event) =>
      handleSubscriptionUpdated(event as Stripe.CustomerSubscriptionUpdatedEvent)
    )
    .with({ type: 'customer.subscription.deleted' }, (event) =>
      handleSubscriptionDeleted(event as Stripe.CustomerSubscriptionDeletedEvent)
    )
    .with({ type: 'invoice.created' }, (event) =>
      handleInvoiceCreated(event as Stripe.InvoiceCreatedEvent)
    )
    .with({ type: 'invoice.payment_succeeded' }, (event) =>
      handleInvoicePaymentSucceeded(event as Stripe.InvoicePaymentSucceededEvent)
    )
    .with({ type: 'invoice.payment_failed' }, (event) =>
      handleInvoicePaymentFailed(event as Stripe.InvoicePaymentFailedEvent)
    )
    .with({ type: 'payment_intent.succeeded' }, (event) =>
      handlePaymentIntentSucceeded(event as Stripe.PaymentIntentSucceededEvent)
    )
    .with({ type: 'payment_intent.payment_failed' }, (event) =>
      handlePaymentIntentFailed(event as Stripe.PaymentIntentPaymentFailedEvent)
    )
    .otherwise((event) => {
      logger.error('Unhandled Stripe event type. Not retrying cause it will not fix anything', {
        eventType: event.type,
        eventId: event.id
      });
      return Promise.resolve();
    })
    .then(
      tap(() => {
        logger.info('Successfully processed Stripe webhook event', {
          eventId: stripeEvent.id,
          eventType: stripeEvent.type
        });
      })
    );
}

// TODO: turn event into Notifycal's and feed audit trail. We need userId and stuff for that

function handleCustomerCreated(event: Stripe.CustomerCreatedEvent): Promise<void> {
  const customer = event.data.object;
  logger.info('Handling customer created', {
    customerId: customer.id,
    email: customer.email
  });
  return Promise.resolve();

  // TODO: Implement customer creation logic
  // - Create user record in your database
  // - Set up default preferences
  // - Send welcome email
  // - Initialize billing settings
}

function handleCustomerUpdated(event: Stripe.CustomerUpdatedEvent): Promise<void> {
  const customer = event.data.object;
  const previousAttributes = event.data.previous_attributes;
  logger.info('Handling customer updated', {
    customerId: customer.id,
    updatedFields: Object.keys(previousAttributes || {})
  });
  return Promise.resolve();

  // TODO: Implement customer update logic
  // - Update user profile in database
  // - Sync email/phone changes
  // - Update notification preferences if email changed
}

function handleCustomerDeleted(event: Stripe.CustomerDeletedEvent): Promise<void> {
  const customer = event.data.object;
  logger.info('Handling customer deleted', {
    customerId: customer.id
  });
  return Promise.resolve();

  // TODO: Implement customer deletion logic
  // - Mark user as deleted (soft delete recommended)
  // - Cancel all active reminders
  // - Clean up personal data (GDPR compliance)
  // - Send account closure confirmation
}

function handleSubscriptionCreated(event: Stripe.CustomerSubscriptionCreatedEvent): Promise<void> {
  const subscription = event.data.object;
  logger.info('Handling subscription created', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status
  });
  return Promise.resolve();

  // TODO: Implement subscription creation logic
  // - Activate user account features
  // - Set subscription limits (reminders per month, etc.)
  // - Send subscription confirmation email
  // - Schedule trial end reminder if in trial
}

function handleSubscriptionUpdated(event: Stripe.CustomerSubscriptionUpdatedEvent): Promise<void> {
  const subscription = event.data.object;
  const previousAttributes = event.data.previous_attributes;
  logger.info('Handling subscription updated', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
    updatedFields: Object.keys(previousAttributes || {})
  });
  return Promise.resolve();

  // TODO: Implement subscription update logic
  // - Handle status changes (active -> past_due, canceled, etc.)
  // - Update feature limits based on new plan
  // - Send notification emails for important changes
  // - Handle plan upgrades/downgrades
  // - Schedule reminders for trial ending
}

function handleSubscriptionDeleted(event: Stripe.CustomerSubscriptionDeletedEvent): Promise<void> {
  const subscription = event.data.object;
  logger.info('Handling subscription deleted', {
    subscriptionId: subscription.id,
    customerId: subscription.customer
  });
  return Promise.resolve();

  // TODO: Implement subscription deletion logic
  // - Deactivate premium features
  // - Move to free tier or suspend account
  // - Cancel all scheduled reminders beyond free limits
  // - Send subscription cancellation email
  // - Offer win-back campaign
}

function handleInvoiceCreated(event: Stripe.InvoiceCreatedEvent): Promise<void> {
  const invoice = event.data.object;
  logger.info('Handling invoice created', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_due
  });
  return Promise.resolve();

  // TODO: Implement invoice creation logic
  // - Send invoice notification email
  // - Log billing event for analytics
  // - Set up payment reminder if needed
}

function handleInvoicePaymentSucceeded(event: Stripe.InvoicePaymentSucceededEvent): Promise<void> {
  const invoice = event.data.object;
  logger.info('Handling invoice payment succeeded', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid
  });
  return Promise.resolve();

  // TODO: Implement successful payment logic
  // - Send payment confirmation email
  // - Extend service period
  // - Clear any payment failure flags
  // - Update billing analytics
}

function handleInvoicePaymentFailed(event: Stripe.InvoicePaymentFailedEvent): Promise<void> {
  const invoice = event.data.object;
  logger.info('Handling invoice payment failed', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_due
  });
  return Promise.resolve();

  // TODO: Implement payment failure logic
  // - Send payment failure notification
  // - Set account to past due status
  // - Schedule retry reminders
  // - Potentially downgrade service after grace period
}

function handlePaymentIntentSucceeded(event: Stripe.PaymentIntentSucceededEvent): Promise<void> {
  const paymentIntent = event.data.object;
  logger.info('Handling payment intent succeeded', {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount
  });
  return Promise.resolve();

  // TODO: Implement payment success logic
  // - Confirm one-time payment completion
  // - Activate purchased features
  // - Send receipt/confirmation
}

function handlePaymentIntentFailed(event: Stripe.PaymentIntentPaymentFailedEvent): Promise<void> {
  const paymentIntent = event.data.object;
  logger.info('Handling payment intent failed', {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount
  });
  return Promise.resolve();

  // TODO: Implement payment failure logic
  // - Notify customer of payment failure
  // - Provide retry options
  // - Log failure for analytics
}
