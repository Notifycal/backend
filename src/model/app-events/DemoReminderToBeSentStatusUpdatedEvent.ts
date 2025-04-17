import { VonageMessageStatusWebhookSchema } from '@model/vendor/vonage';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentAttemptSentEventSchema } from './DemoReminderToBeSentAttemptSentEvent';

export const demoReminderToBeSentStatusUpdatedEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentStatusUpdated',
  demoReminderToBeSentAttemptSentEventSchema.shape.data.extend({
    messageStatusPayload: VonageMessageStatusWebhookSchema
  })
);

export type DemoReminderToBeSentStatusUpdatedEvent = z.infer<
  typeof demoReminderToBeSentStatusUpdatedEventSchema
>;
