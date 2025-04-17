import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentEventSchema } from './DemoReminderToBeSentEvent';

export const demoReminderToBeSentAttemptFailedEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptFailed',
  demoReminderToBeSentEventSchema.shape.data.extend({
    providerErrorPayload: z.any() // TODO: review this schema when we've replaced the Vonage SDK with Axios
  })
);

export type DemoReminderToBeSentAttemptFailedEvent = z.infer<
  typeof demoReminderToBeSentAttemptFailedEventSchema
>;
