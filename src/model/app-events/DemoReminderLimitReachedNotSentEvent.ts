import type { DemoCounterLimitReachedError } from '@services/credits-service';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import {
  demoReminderToBeSentEventSchema,
  type DemoReminderToBeSentEvent
} from './DemoReminderToBeSentEvent';

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
    ...originalEvent,
    eventType: 'DemoReminderLimitReachedNotSent',
    data: {
      originalEvent: {
        ...originalEvent.data
      },
      error: demoLimitReachedError
    }
  };
}
