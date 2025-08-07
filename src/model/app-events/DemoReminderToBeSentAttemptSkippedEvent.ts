import type { Uuid } from '@notifycal/shared/types';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';
import { demoReminderToBeSentAttemptSentEventSchema } from './DemoReminderToBeSentAttemptSentEvent';
import type { DemoReminderToBeSentEvent } from './DemoReminderToBeSentEvent';

export const demoReminderToBeSentAttemptSkippedEventEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptSkipped',
  demoReminderToBeSentAttemptSentEventSchema.shape.data.omit({ demoCounterIncrementResult: true })
);

export type DemoReminderToBeSentAttemptSkippedEvent = z.infer<
  typeof demoReminderToBeSentAttemptSkippedEventEventSchema
>;

export function demoReminderToBeSentAttemptSkipped(
  originalEvent: DemoReminderToBeSentEvent,
  messageSentUUID: Uuid
): DemoReminderToBeSentAttemptSkippedEvent {
  return {
    ...createEventBase('DemoReminderToBeSentAttemptSkipped', originalEvent, {
      correlationId: originalEvent.correlationId
    }),
    data: {
      ...originalEvent.data,
      messageUUID: messageSentUUID
    }
  };
}
