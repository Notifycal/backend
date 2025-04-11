import { uuidSchema } from '@notifycal/shared/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { reminderToBeSentEventSchema } from './ReminderToBeSentEvent';

export const reminderToBeSentAttemptSentEventSchema = eventSchemaGenerator(
  'ReminderToBeSentAttemptSent',
  reminderToBeSentEventSchema.shape.data.extend({
    messageUUID: uuidSchema
  })
);

export type ReminderToBeSentAttemptSentEvent = z.infer<
  typeof reminderToBeSentAttemptSentEventSchema
>;
