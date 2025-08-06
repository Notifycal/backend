import type { DemoCounterLimitReachedError } from '@model/Credits';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import {
  type DemoReminderToBeSentEvent,
  demoReminderToBeSentEventSchema
} from './DemoReminderToBeSentEvent';
import { createEventBase } from './common';

const dataSchema = z.object({
  originalEvent: demoReminderToBeSentEventSchema.shape.data,
  error: z.unknown()
});

export const demoReminderLimitReachedNotSentEventSchema = eventSchemaGenerator(
  'DemoReminderLimitReachedNotSent',
  dataSchema
);

export type DemoReminderLimitReachedNotSentEvent = z.infer<
  typeof demoReminderLimitReachedNotSentEventSchema
>;

export function demoReminderLimitReachedNotSent(
  originalEvent: DemoReminderToBeSentEvent,
  demoLimitReachedError: DemoCounterLimitReachedError
): DemoReminderLimitReachedNotSentEvent {
  return {
    ...createEventBase('DemoReminderLimitReachedNotSent', originalEvent, {
      correlationId: originalEvent.correlationId
    }),
    data: {
      originalEvent: {
        ...originalEvent.data
      },
      error: demoLimitReachedError
    }
  };
}
