import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { baseMessagingEventDataSchema } from './messaging-common';

const dataSchema = baseMessagingEventDataSchema;
export const demoReminderToBeSentEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSent',
  dataSchema
);

export type DemoReminderToBeSentEvent = z.infer<typeof demoReminderToBeSentEventSchema>;
