import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { calendarEventDataLightened } from '@model/app-events/ActionableEventReminderStatusUpdatedEvent';
import { demoReminderToBeSentEventSchema } from '@model/app-events/DemoReminderToBeSentEvent';
import {
  creditDeductionDeductSuccessSchema,
  demoCounterIncrementSuccessSchema
} from '@model/Credits';
import { smsLengthCountEstimateResultSchema } from '@model/Sms';
import { z } from 'zod';

export const actionableEventFoundLightenedSchema = actionableEventFoundEventSchema
  .omit({
    eventId: true,
    happenedAt: true
  })
  .extend({
    data: actionableEventFoundEventSchema.shape.data
      .extend({
        calendarEvent: calendarEventDataLightened
      })
      .omit({ message: true })
  });
export type ActionableEventFoundLightenedEvent = z.infer<
  typeof actionableEventFoundLightenedSchema
>;

export const demoReminderToBeSentEventLightenedSchema = demoReminderToBeSentEventSchema
  .omit({
    eventId: true,
    happenedAt: true
  })
  .extend({
    data: demoReminderToBeSentEventSchema.shape.data.omit({ message: true })
  });

export type DemoReminderToBeSentLightenedEvent = z.infer<
  typeof demoReminderToBeSentEventLightenedSchema
>;
const coerced = true;
export const webhookCorrelationDataSchema = z.union([
  z.object({
    originalEvent: actionableEventFoundLightenedSchema,
    creditDeductionResult: creditDeductionDeductSuccessSchema(coerced),
    estimatedMessageCount: smsLengthCountEstimateResultSchema(coerced).pick({ messages: true })
  }),
  z.object({
    originalEvent: demoReminderToBeSentEventLightenedSchema,
    creditDeductionResult: demoCounterIncrementSuccessSchema(coerced),
    estimatedMessageCount: smsLengthCountEstimateResultSchema(coerced).pick({ messages: true })
  })
]);

export type WebhookCorrelationData = z.infer<typeof webhookCorrelationDataSchema>;
