import { uuidSchema } from '@notifycal/shared/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentEventSchema } from './DemoReminderToBeSentEvent';

export const demoReminderToBeSentAttemptSentEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptSent',
  demoReminderToBeSentEventSchema.shape.data.extend({
    messageUUID: uuidSchema
  })
);

export type DemoReminderToBeSentAttemptSentEvent = z.infer<
  typeof demoReminderToBeSentAttemptSentEventSchema
>;
