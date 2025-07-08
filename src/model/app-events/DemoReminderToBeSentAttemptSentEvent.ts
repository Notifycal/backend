import { messagingSentPayloadSchema } from '@model/vendor/vonage/schemas';
import type { Uuid } from '@notifycal/shared/types';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import {
  demoReminderToBeSentEventSchema,
  type DemoReminderToBeSentEvent
} from './DemoReminderToBeSentEvent';

export const demoReminderToBeSentAttemptSentEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptSent',
  demoReminderToBeSentEventSchema.shape.data.extend(messagingSentPayloadSchema.shape)
);

export type DemoReminderToBeSentAttemptSentEvent = z.infer<
  typeof demoReminderToBeSentAttemptSentEventSchema
>;

export function demoReminderToBeSentAttemptSent(
  originalEvent: DemoReminderToBeSentEvent,
  messageSentUUID: Uuid
): DemoReminderToBeSentAttemptSentEvent {
  return {
    ...originalEvent,
    eventType: 'DemoReminderToBeSentAttemptSent',
    data: {
      ...originalEvent.data,
      messageUUID: messageSentUUID
    }
  };
}
