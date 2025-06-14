import type { StripeEventType } from '@lambdas/sqs/stripe-webhook/stripe-schemas';
/* eslint-disable camelcase */
import type { EventBridgeEvent } from 'aws-lambda';
import type Stripe from 'stripe';

export function fakeStripeEventBridgeEvent<TEventType extends StripeEventType>(
  eventType: TEventType
): Omit<EventBridgeEvent<TEventType, object>, 'detail'> {
  return {
    id: 'fakeId',
    version: '97faefa0-b994-1c30-5dfa-95836afeb7b0',
    account: '9999999999',
    time: '2025-02-07T14:53:57.018Z',
    region: 'eu-west-1',
    resources: [
      'arn:aws:events:eu-west-1::event-source/aws.partner/stripe.com/ed_test_77777777777777777777777777777777777777777'
    ],
    source: 'aws.partner/stripe.com/ed_test_77777777777777777777777777777777777777777',
    'detail-type': eventType
  };
}

export function validStripeEventBridgeEvent<T extends StripeEventType>(
  event: Stripe.Event & { type: T }
): EventBridgeEvent<T, Stripe.Event> {
  return {
    ...fakeStripeEventBridgeEvent(event.type),
    detail: event
  };
}

export const validStripeCheckoutSessionCompletedEvent: EventBridgeEvent<
  'checkout.session.completed',
  object
> = validStripeEventBridgeEvent<'checkout.session.completed'>({
  id: 'evt_1RWIaFPLMCn9OYH0FPPvZ1hz',
  object: 'event',
  api_version: '2023-10-16',
  created: 1749048387,
  data: {
    object: {
      id: 'cs_test_a1Z6rK1fXzkSuTUqKP1lrJLeMEgOVMov4nIf8GtqcRBV91Rmvm9FghRKMf',
      object: 'checkout.session',
      adaptive_pricing: { enabled: true },
      after_expiration: null,
      allow_promotion_codes: null,
      amount_subtotal: 3000,
      amount_total: 3000,
      automatic_tax: { enabled: false, liability: null, provider: null, status: null },
      billing_address_collection: null,
      cancel_url: 'https://httpbin.org/post',
      client_reference_id: null,
      client_secret: null,
      collected_information: null,
      consent: null,
      consent_collection: null,
      created: 1749048384,
      currency: 'usd',
      currency_conversion: null,
      custom_fields: [],
      custom_text: {
        after_submit: null,
        shipping_address: null,
        submit: null,
        terms_of_service_acceptance: null
      },
      customer: null,
      customer_creation: 'if_required',
      customer_details: {
        address: {
          city: 'South San Francisco',
          country: 'US',
          line1: '354 Oyster Point Blvd',
          line2: null,
          postal_code: '94080',
          state: 'CA'
        },
        email: 'stripe@example.com',
        name: 'Jenny Rosen',
        phone: null,
        tax_exempt: 'none',
        tax_ids: []
      },
      customer_email: null,
      discounts: [],
      expires_at: 1749134784,
      invoice: null,
      invoice_creation: {
        enabled: false,
        invoice_data: {
          account_tax_ids: null,
          custom_fields: null,
          description: null,
          footer: null,
          issuer: null,
          metadata: {},
          rendering_options: null
        }
      },
      livemode: false,
      locale: null,
      metadata: {},
      mode: 'payment',
      payment_intent: 'pi_3RWIaEPLMCn9OYH01SNq59oo',
      payment_link: null,
      payment_method_collection: 'if_required',
      payment_method_configuration_details: { id: 'pmc_1RW2zePLMCn9OYH0cis0G4TT', parent: null },
      payment_method_options: { card: { request_three_d_secure: 'automatic' } },
      payment_method_types: ['card', 'link'],
      payment_status: 'paid',
      permissions: null,
      phone_number_collection: { enabled: false },
      recovered_from: null,
      saved_payment_method_options: null,
      setup_intent: null,
      shipping_address_collection: null,
      shipping_cost: null,
      shipping_options: [],
      status: 'complete',
      submit_type: null,
      subscription: null,
      success_url: 'https://httpbin.org/post',
      total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
      ui_mode: 'hosted',
      url: null,
      wallet_options: null
    }
  },
  livemode: false,
  pending_webhooks: 0,
  request: { id: null, idempotency_key: null },
  type: 'checkout.session.completed' as const
});
