import { messagingSentPayloadSchema } from '@model/vendor/vonage/schemas';
import type { Uuid } from '@notifycal/shared/types';
import type { z } from 'zod';
import { demoCounterIncrementResultSchema, type DemoCounterIncrementResult } from './../Credits';
import { eventSchemaGenerator } from './BaseEvent';
import {
  demoReminderToBeSentEventSchema,
  type DemoReminderToBeSentEvent
} from './DemoReminderToBeSentEvent';
import { createEventBase } from './common';

export const demoReminderToBeSentAttemptSentEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptSent',
  demoReminderToBeSentEventSchema.shape.data.extend({
    ...messagingSentPayloadSchema.shape,
    demoCounterIncrementResult: demoCounterIncrementResultSchema
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
    ...createEventBase('DemoReminderToBeSentAttemptSent', originalEvent, {
      correlationId: originalEvent.correlationId
    }),
    data: {
      ...originalEvent.data,
      messageUUID: messageSentUUID,
      demoCounterIncrementResult
    }
  };
}
