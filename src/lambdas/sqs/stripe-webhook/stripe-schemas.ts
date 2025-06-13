/* eslint-disable camelcase */
import type Stripe from 'stripe';
import { z } from 'zod';

export const stripeEventTypeSchema = z.custom<Stripe.Event['type']>(
  (val): val is Stripe.Event['type'] => {
    return typeof val === 'string' && val.includes('.');
  },
  {
    message: 'Invalid Stripe event type format'
  }
);

export const stripeEventBaseSchema = z
  .object({
    id: z.string(),
    object: z.literal('event'),
    created: z.number(),
    type: stripeEventTypeSchema,
    livemode: z.boolean(),
    pending_webhooks: z.number(),
    request: z
      .object({
        id: z.string().nullable(),
        idempotency_key: z.string().nullable()
      })
      .nullable(),
    data: z.object({
      object: z.unknown(),
      previous_attributes: z.record(z.unknown()).optional()
    }),
    api_version: z.string().nullable()
  })
  .transform((data) => {
    return data as Stripe.Event;
  });

export type StripeEventType = z.infer<typeof stripeEventTypeSchema>;