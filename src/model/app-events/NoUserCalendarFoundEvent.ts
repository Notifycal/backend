import type { Record } from '@lambdas/sqs/fetch-user-calendars/index';
import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import type { CorrelationId, EventId, IdpName } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { eventIdSchema, runSchema, createEventBase, fromUserIdentity } from './common';

const data = z.object({
  awsEventIdCause: eventIdSchema,
  run: runSchema
});
export const noUserCalendarFoundEventSchema = eventSchemaGenerator('NoUserCalendarFound', data);

export type NoUserCalendarFoundEvent = z.infer<typeof noUserCalendarFoundEventSchema>;

export function noUserCalendarFound(
  origin: Record['body'],
  run: z.infer<typeof runSchema>,
  liveUser: LiveUserStoreRecord<IdpName>
): NoUserCalendarFoundEvent {
  return {
    ...createEventBase('NoUserCalendarFound', fromUserIdentity(liveUser), {
      correlationId: origin.id as CorrelationId
    }),
    data: {
      awsEventIdCause: origin.id as EventId,
      run: run
    }
  };
}
