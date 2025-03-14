import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { actionableEventFoundEventSchema } from './ActionableEventFoundEvent';

export const calendarEventReminderAttemptFailedEventSchema = eventSchemaGenerator(
  'CalendarEventReminderAttemptFailed',
  actionableEventFoundEventSchema.shape.data.extend({
    providerErrorPayload: z.any() // TODO: review this schema when we've replaced the Vonage SDK with Axios
  })
);

export type CalendarEventReminderAttemptFailedEvent = z.infer<
  typeof calendarEventReminderAttemptFailedEventSchema
>;
