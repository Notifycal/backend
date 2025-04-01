import type { Event } from '@lambdas/schedule/fetch-user-calendars/index';
import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import type { CorrelationId, DateTime, EventId, IdpName } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import { eventIdSchema, runSchema } from './common';

const data = z.object({
  awsEventIdCause: eventIdSchema,
  run: runSchema
});
export const noUserCalendarFoundEventSchema = errorEventSchemaGenerator(
  'NoUserCalendarFound',
  data
);

export type NoUserCalendarFoundEvent = z.infer<typeof noUserCalendarFoundEventSchema>;

export function noUserCalendarFound(
  origin: Event,
  run: z.infer<typeof runSchema>,
  liveUser: LiveUserStoreRecord<IdpName>
): NoUserCalendarFoundEvent {
  return {
    eventId: v4() as EventId,
    correlationId: origin.id as CorrelationId,
    eventType: 'NoUserCalendarFound',
    happenedAt: new Date().toISOString() as DateTime,
    userId: liveUser.UserId,
    idp: liveUser.Idp,
    idpId: liveUser.IdpId,
    data: {
      awsEventIdCause: origin.id as EventId,
      run: run
    }
  };
}
