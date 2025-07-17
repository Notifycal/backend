import type { DemoCounterDecrementResult, DemoCounterIncrementResult } from '@model/Credits';
import {
  type VonageWebhookMessageStatusPayload,
  messagingMessageStatusPayloadSchema
} from '@model/vendor/vonage/schemas';
import type { DateTime, EventId } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentAttemptSentEventSchema } from './DemoReminderToBeSentAttemptSentEvent';
import type { DemoReminderToBeSentEvent } from './DemoReminderToBeSentEvent';

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

export function demoReminderToBeSentReminderStatusUpdated(
  rebuiltEventObject: Omit<DemoReminderToBeSentEvent, 'eventId' | 'happenedAt'>,
  event: VonageWebhookMessageStatusPayload,
  demoCounterIncrementResult: DemoCounterIncrementResult,
  demoCounterAdjustmentResult?: DemoCounterDecrementResult
): DemoReminderToBeSentStatusUpdatedEvent {
  return {
    ...rebuiltEventObject,
    eventType: 'DemoReminderToBeSentStatusUpdated',
    eventId: v4() as EventId,
    happenedAt: new Date().toISOString() as DateTime,
    data: {
      ...rebuiltEventObject.data,
      messageUUID: event.message_uuid,
      messageStatusPayload: {
        ...event
      },
      demoCounterIncrementResult,
      demoCounterAdjustmentResult
    }
  };
}
