import type { Record } from '@lambdas/sqs/fetch-user-calendars/index';
import type { CorrelationId, EventId, IdpName, UserIdentity } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase, eventIdSchema, runSchema } from './common';

const data = z.object({
  awsEventIdCause: eventIdSchema,
  run: runSchema
});
export const noUserCalendarFoundEventSchema = eventSchemaGenerator('NoUserCalendarFound', data);

export type NoUserCalendarFoundEvent = z.infer<typeof noUserCalendarFoundEventSchema>;

export function noUserCalendarFound(
  origin: Record['body'],
  run: z.infer<typeof runSchema>,
  userIdentity: UserIdentity<IdpName>
): NoUserCalendarFoundEvent {
  return {
    ...createEventBase('NoUserCalendarFound', userIdentity, {
      correlationId: origin.id as CorrelationId
    }),
    data: {
      awsEventIdCause: origin.id as EventId,
      run: run
    }
  };
}
