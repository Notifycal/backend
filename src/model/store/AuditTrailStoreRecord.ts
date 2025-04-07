import type { EventType, SystemEventType } from '@model/app-events/BaseEvent';
import type {
  Brand,
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

export type AuditTrailStoreRecordOrigin = Brand<string, 'Origin'>;

export interface AuditTrailStoreRecord {
  EventId: EventId;
  CorrelationId: CorrelationId;
  UserId: UserId | 'System';
  IdpId: IdpId | 'N/A';
  Idp: IdpName | 'N/A';
  EventType: EventType | SystemEventType;
  HappenedAt: DateTime;
  Data: Data;
  Origin: AuditTrailStoreRecordOrigin;
}
