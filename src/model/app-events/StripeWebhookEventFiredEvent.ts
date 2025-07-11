import { stripeEventTypes } from '@lambdas/sqs/stripe-webhook/stripe-schemas';
import type { IdpName, UserIdentity } from '@notifycal/shared/types';
import { toPascalCase } from '@utils/case';
import type { CapitalizeFirst, ReplaceUnderscoreWithDot, SplitByDot } from '@utils/types';
import type Stripe from 'stripe';
import { z } from 'zod';
import type { baseEventSchema } from './BaseEvent';
import { createEventBase } from './common';

type JoinWithPaymentPrefix<T extends ReadonlyArray<string>> = T extends readonly [
  infer First,
  ...infer Rest
]
  ? First extends string
    ? Rest extends ReadonlyArray<string>
      ? Rest['length'] extends 0
        ? `Payment${CapitalizeFirst<First>}`
        : `Payment${CapitalizeFirst<First>}${JoinWithPaymentPrefix<Rest>}`
      : never
    : never
  : 'Payment';

export type PascalCaseEventType<T extends string> = T extends string
  ? ReplaceUnderscoreWithDot<T> extends infer Normalized
    ? Normalized extends string
      ? SplitByDot<Normalized> extends infer Parts
        ? Parts extends ReadonlyArray<string>
          ? Parts['length'] extends 1
            ? `Payment${CapitalizeFirst<Normalized>}`
            : JoinWithPaymentPrefix<Parts>
          : never
        : never
      : never
    : never
  : never;

type OurStripeEventType = PascalCaseEventType<Stripe.Event['type']>;

export type PaymentWebhookFiredEvent = z.infer<typeof baseEventSchema>;

function toOurEventType(eventType: Stripe.Event['type']): OurStripeEventType {
  return `Payment${toPascalCase(eventType)}` as OurStripeEventType;
}

export const ourStripeEventTypeZodLiteralArray = stripeEventTypes.map((type) => {
  const ourEventType = toOurEventType(type);
  return z.literal(ourEventType);
}) as [
  z.ZodLiteral<OurStripeEventType>,
  z.ZodLiteral<OurStripeEventType>,
  ...Array<z.ZodLiteral<OurStripeEventType>>
];

export function fromStripeEvent(
  origin: Stripe.Event,
  userIdentity: UserIdentity<IdpName>
): PaymentWebhookFiredEvent {
  const stripeEventType = origin.type;
  return {
    ...createEventBase(toOurEventType(stripeEventType), userIdentity),
    data: {
      ...origin
    }
  };
}
