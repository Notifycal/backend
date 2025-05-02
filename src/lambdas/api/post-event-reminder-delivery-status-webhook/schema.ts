import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { demoReminderToBeSentEventSchema } from '@model/app-events/DemoReminderToBeSentEvent';
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
