import type { DemoCounterDecrementResult } from '@model/Credits';
import { messagingMessageStatusPayloadSchema } from '@model/vendor/vonage/schemas';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentAttemptSentEventSchema } from './DemoReminderToBeSentAttemptSentEvent';

export const demoReminderToBeSentStatusUpdatedEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentStatusUpdated',
  demoReminderToBeSentAttemptSentEventSchema.shape.data.extend({
    ...messagingMessageStatusPayloadSchema.shape,
    demoCounterAdjustmentResult: z.custom<DemoCounterDecrementResult>().optional()
  })
);

export type DemoReminderToBeSentStatusUpdatedEvent = z.infer<
  typeof demoReminderToBeSentStatusUpdatedEventSchema
>;
