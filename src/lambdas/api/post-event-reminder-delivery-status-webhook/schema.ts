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
      }),
      run: actionableEventFoundEventDataSchema.shape.run.extend({
        slidingWindowInMinutes: z.coerce.number().int().positive()
      })
    })
  });

export const demoReminderToBeSentEventQuerySchema = demoReminderToBeSentEventSchema.omit({
  eventId: true,
  happenedAt: true
});

export const webhookCorrelationDataSchema = z.union([
  z.object({
    originalEvent: actionableEventQuerySchema,
    creditDeductionResult: creditDeductionDeductSuccessSchema,
    estimatedMessageCount: smsLengthCountEstimateResultSchema
  }),
  z.object({
    originalEvent: demoReminderToBeSentEventQuerySchema,
    creditDeductionResult: demoCounterIncrementSuccessSchema,
    estimatedMessageCount: smsLengthCountEstimateResultSchema
  })
]);

export type WebhookCorrelationData = z.infer<typeof webhookCorrelationDataSchema>;
