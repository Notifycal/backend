import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { NoPhoneNumberForCalendarEventFoundEvent } from '@model/app-events/NoPhoneNumberForCalendarEventFoundEvent';
import type { UnixTimestamp } from '@notifycal/shared/types';
import type { DateTime } from 'luxon';

export class EventTypeDate {
  public readonly value: string;
  public constructor(
    eventType:
      | ActionableEventFoundEvent['eventType']
      | NoPhoneNumberForCalendarEventFoundEvent['eventType'],
    dateTime: DateTime
  ) {
    this.value = `${eventType}#${dateTime.toISODate()}`;
  }
}

export interface AlertStoreRecord<THashKey, TSortKey> {
  HashKey: THashKey;
  SortKey: TSortKey;
  SuccessCount: number | undefined;
  FailureCount: number | undefined;
  NotificationSentCount: number | undefined;
  ExpiresAt: UnixTimestamp;
}

export type AlertCounterKeyNames = keyof Pick<
  AlertStoreRecord<unknown, unknown>,
  'SuccessCount' | 'FailureCount' | 'NotificationSentCount'
>;
