/* eslint-disable camelcase */
import type Stripe from 'stripe';
import { z } from 'zod';

export const stripeEventBaseSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  created: z.number(),
  type: z.string(),
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
});

export const stripeWebhookEventSchema = stripeEventBaseSchema.transform((data) => {
  return data as Stripe.Event;
});

export type StripeWebhookEvent = Stripe.Event;
