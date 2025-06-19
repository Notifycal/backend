import { stripeEventTypeSchema } from '@lambdas/sqs/stripe-webhook/stripe-schemas';
import type {
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  IdpName,
  UserId
} from '@notifycal/shared/types';
import { toPascalCase } from '@utils/case';
import type { PascalCaseEventType } from '@utils/types';
import type Stripe from 'stripe';
import type { z } from 'zod';
import type { baseEventSchema } from './BaseEvent';

type OurStripeEventType<T extends Stripe.Event['type']> = PascalCaseEventType<T>;

export type PaymentWebhookFiredEvent = z.infer<typeof baseEventSchema>;

function formatEventName(parts: Array<string>): OurStripeEventType<Stripe.Event['type']> {
  const lastPart = parts.pop();
  return (parts.join('') + 'Event' + lastPart) as OurStripeEventType<Stripe.Event['type']>;
}

function convertToOurEventType(stripeEventType: string): OurStripeEventType<Stripe.Event['type']> {
  return formatEventName(stripeEventType.split('.').map(toPascalCase));
}

export const ourStripeEventTypeSchema = stripeEventTypeSchema.transform(convertToOurEventType);

function toOurEventType<T extends Stripe.Event['type']>(eventType: T): OurStripeEventType<T> {
  return eventType.split('.').reduce((acc, part) => {
    return acc + part.charAt(0).toUpperCase() + part.slice(1);
  }, 'Payment') as OurStripeEventType<T>;
}

export function fromStripeEvent(
  origin: Stripe.Event,
  userId: UserId,
  idp: IdpName,
  idpId: IdpId
): PaymentWebhookFiredEvent {
  const eventId = origin.id;
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
