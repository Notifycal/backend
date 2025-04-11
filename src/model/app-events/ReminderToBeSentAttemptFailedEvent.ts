import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { reminderToBeSentEventSchema } from './ReminderToBeSentEvent';

export const reminderToBeSentAttemptFailedEventSchema = eventSchemaGenerator(
  'ReminderToBeSentAttemptFailed',
  reminderToBeSentEventSchema.shape.data.extend({
    providerErrorPayload: z.any() // TODO: review this schema when we've replaced the Vonage SDK with Axios
  })
);

export type ReminderToBeSentAttemptFailedEvent = z.infer<
  typeof reminderToBeSentAttemptFailedEventSchema
>;
