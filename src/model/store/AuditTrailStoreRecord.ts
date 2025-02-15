import type { Data, EventType } from '@model/app-events/BaseEvent';
import type {
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  IdpName,
  UnixTimestamp,
  UserId
} from '@notifycal/shared/types';

export interface AuditTrailStoreRecord {
  EventId: EventId;
  CorrelationId: CorrelationId;
  UserId: UserId;
  IdpId: IdpId;
  Idp: IdpName;
  EventType: EventType;
  HappenedAt: DateTime;
  Data: Data;
  ExpiresAt: UnixTimestamp;
}
