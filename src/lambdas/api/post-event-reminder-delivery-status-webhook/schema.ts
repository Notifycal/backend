import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { demoReminderToBeSentEventSchema } from '@model/app-events/DemoReminderToBeSentEvent';
import { z } from 'zod';

export const vonageAccessTokenSchema = z.object({
  header: z.object({
    alg: z.string(),
    typ: z.string()
  }),
  payload: z.object({
    jti: z.string(),
    iat: z.number(),
    iss: z.string(),
    // eslint-disable-next-line camelcase
    api_key: z.string(),
    // eslint-disable-next-line camelcase
    application_id: z.string(),
    // eslint-disable-next-line camelcase
    payload_hash: z.string().optional()
  }),
  signature: z.string()
});
export type VonageAccessToken = z.infer<typeof vonageAccessTokenSchema>;

const actionableEventFoundEventDataSchema = actionableEventFoundEventSchema.shape.data;
export const actionableEventQuerySchema = actionableEventFoundEventSchema
  .omit({
    eventId: true,
    eventType: true,
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

export const demoReminderToBeSentQuerySchema = demoReminderToBeSentEventSchema.omit({
  eventId: true,
  eventType: true,
  happenedAt: true
});
