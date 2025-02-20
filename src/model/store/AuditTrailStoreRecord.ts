import type { EventType } from '@model/app-events/BaseEvent';
import type { Data } from '@model/app-events/common';
import type {
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  IdpName,
  UserId
} from '@notifycal/shared/types';
import { z } from 'zod';

export const dataSchema = z.object({}).passthrough();
export type Data = z.infer<typeof dataSchema>;

export interface AuditTrailStoreRecord {
  EventId: EventId;
  CorrelationId: CorrelationId;
  UserId: UserId;
  IdpId: IdpId;
  Idp: IdpName;
  EventType: EventType;
  HappenedAt: DateTime;
  Data: Data;
}
