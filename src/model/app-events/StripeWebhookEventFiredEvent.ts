import { stripeEventTypes } from '@lambdas/sqs/stripe-webhook/stripe-schemas';
import type {
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  IdpName,
  UserId
} from '@notifycal/shared/types';
import { toPascalCase } from '@utils/case';
import type { CapitalizeFirst, ReplaceUnderscoreWithDot, SplitByDot } from '@utils/types';
import type Stripe from 'stripe';
import { v4 } from 'uuid';
import { z } from 'zod';
import type { baseEventSchema } from './BaseEvent';

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
  userId: UserId,
  idp: IdpName,
  idpId: IdpId
): PaymentWebhookFiredEvent {
  const eventId = v4();
  const stripeEventType = origin.type;
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: toOurEventType(stripeEventType),
    happenedAt: new Date().toISOString() as DateTime,
    userId: userId,
    idp: idp,
    idpId: idpId,
    data: {
      ...origin
    }
  };
}
