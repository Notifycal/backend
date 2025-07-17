import { messagingSentPayloadSchema } from '@model/vendor/vonage/schemas';
import type { Uuid } from '@notifycal/shared/types';
import { z } from 'zod';
import type { DemoCounterIncrementResult } from './../Credits';
import { eventSchemaGenerator } from './BaseEvent';
import {
  demoReminderToBeSentEventSchema,
  type DemoReminderToBeSentEvent
} from './DemoReminderToBeSentEvent';

export const demoReminderToBeSentAttemptSentEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptSent',
  demoReminderToBeSentEventSchema.shape.data.extend({
    ...messagingSentPayloadSchema.shape,
    demoCounterIncrementResult: z.custom<DemoCounterIncrementResult>()
  })
);

export type DemoReminderToBeSentAttemptSentEvent = z.infer<
  typeof demoReminderToBeSentAttemptSentEventSchema
>;

export function demoReminderToBeSentAttemptSent(
  originalEvent: DemoReminderToBeSentEvent,
  messageSentUUID: Uuid,
  demoCounterIncrementResult: DemoCounterIncrementResult
): DemoReminderToBeSentAttemptSentEvent {
  return {
    ...originalEvent,
    eventType: 'DemoReminderToBeSentAttemptSent',
    data: {
      ...originalEvent.data,
      messageUUID: messageSentUUID,
      demoCounterIncrementResult
    }
  };
}
