import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { demoReminderToBeSentEventSchema } from '@model/app-events/DemoReminderToBeSentEvent';
import {
  creditDeductionDeductSuccessSchema,
  demoCounterIncrementSuccessSchema
} from '@model/Credits';
import { smsLengthCountEstimateResultSchema } from '@model/Sms';
import { z } from 'zod';

const actionableEventFoundEventDataSchema = actionableEventFoundEventSchema.shape.data;
export const actionableEventQuerySchema = actionableEventFoundEventSchema
  .omit({
    eventId: true,
    happenedAt: true
  })
  // I hate this, but writing something generic to coerce specific schema paths proved quite challenging
  .extend({
    data: actionableEventFoundEventDataSchema.extend({
      calendarEvent: actionableEventFoundEventDataSchema.shape.calendarEvent.extend({
        isAllDayEvent: z.string().transform((val) => val === 'true')
      })
    })
  });

export const demoReminderToBeSentEventQuerySchema = demoReminderToBeSentEventSchema.omit({
  eventId: true,
  happenedAt: true
});
const coerced = true;
export const webhookCorrelationDataSchema = z.union([
  z.object({
    originalEvent: actionableEventQuerySchema,
    creditDeductionResult: creditDeductionDeductSuccessSchema(coerced),
    estimatedMessageCount: smsLengthCountEstimateResultSchema(coerced)
  }),
  z.object({
    originalEvent: demoReminderToBeSentEventQuerySchema,
    creditDeductionResult: demoCounterIncrementSuccessSchema(coerced),
    estimatedMessageCount: smsLengthCountEstimateResultSchema(coerced)
  })
]);

export type WebhookCorrelationData = z.infer<typeof webhookCorrelationDataSchema>;
