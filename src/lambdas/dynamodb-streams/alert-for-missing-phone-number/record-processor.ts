import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import {
  EventTypeDate,
  type AlertCounterKeyNames,
  type AlertStoreRecord
} from '@model/store/AlertStoreRecord';
import type { DateTime, Email, EventId, UserId } from '@notifycal/shared/types';
import type { EmailHtmlBody, EmailSubject } from '@own-types/model';
import { throwError } from '@services/common/error-handling';
import type { SnsService } from '@services/sns';
import type { AlertsBaseStore } from '@services/stores/alerts-base-store';
import { tap } from '@utils/promises';
import { DateTime as DT } from 'luxon';
import { match } from 'ts-pattern';
import { v4 } from 'uuid';
import type {
  AuditTrailActionableEventFoundEvent,
  AuditTrailNoPhoneNumberForCalendarEventFoundEvent,
  Record
} from './schema';

function emailToBeSent(
  origin: AuditTrailActionableEventFoundEvent | AuditTrailNoPhoneNumberForCalendarEventFoundEvent,
  data: EmailToBeSentEvent['data']
): EmailToBeSentEvent {
  return {
    eventId: v4() as EventId,
    correlationId: origin.CorrelationId,
    eventType: 'EmailToBeSent',
    happenedAt: new Date().toISOString() as DateTime,
    userId: origin.UserId,
    idp: origin.Idp,
    idpId: origin.IdpId,
    data: data
  };
}

function updateCounterOnEventReceived(
  hashKey: EventTypeDate,
  sortKey: UserId,
  eventType: Record['NewImage']['EventType'],
  alertsBaseStore: AlertsBaseStore
): Promise<AlertStoreRecord<EventTypeDate['value'], UserId>> {
  const counterToIncrement: AlertCounterKeyNames = match(eventType)
    .with('ActionableEventFound', () => 'SuccessCount' as const)
    .with('NoPhoneNumberForCalendarEventFound', () => 'FailureCount' as const)
    .exhaustive();
  return alertsBaseStore.incrementCounter<EventTypeDate['value'], UserId>(
    hashKey.value,
    sortKey,
    counterToIncrement
  );
}

function updateCounterOnAlertSent(
  hashKey: EventTypeDate,
  sortKey: UserId,
  alertsBaseStore: AlertsBaseStore
): Promise<AlertStoreRecord<EventTypeDate['value'], UserId>> {
  return alertsBaseStore.incrementCounter<EventTypeDate['value'], UserId>(
    hashKey.value,
    sortKey,
    'NotificationSentCount'
  );
}

function sendAlert(
  event: Record['NewImage'],
  hashKey: EventTypeDate,
  sortKey: UserId,
  updateCounterResult: AlertStoreRecord<EventTypeDate['value'], UserId>,
  alertsBaseStore: AlertsBaseStore,
  snsService: SnsService
): Promise<void> {
  const alertData = {
    to: 'foobar@notifycal.com' as Email,
    subject: 'Un rabo' as EmailSubject,
    htmlBody: `<h1>Otro rabo. ${updateCounterResult.FailureCount} errors</h1>` as EmailHtmlBody,
    tags: []
  };
  const alertEvent: EmailToBeSentEvent = emailToBeSent(event, alertData);
  return snsService
    .publish(alertEvent)
    .then(tap(() => updateCounterOnAlertSent(hashKey, sortKey, alertsBaseStore)))
    .then();
}

function buildPersistanceKeys(event: Record['NewImage']): {
  hashKey: EventTypeDate;
  sortKey: UserId;
} {
  const happenedAt = DT.fromISO(event.HappenedAt).toUTC();
  const hashKey = new EventTypeDate(event.EventType, happenedAt);
  const sortKey = event.UserId;
  return { hashKey, sortKey };
}

export function recordProcessor(
  record: Record,
  alertsBaseStore: AlertsBaseStore,
  snsService: SnsService
): Promise<void> {
  const event = record.NewImage;
  const { hashKey, sortKey } = buildPersistanceKeys(event);
  return updateCounterOnEventReceived(hashKey, sortKey, event.EventType, alertsBaseStore)
    .then(
      tap((result) => {
        const { SuccessCount, FailureCount, NotificationSentCount } = result;
        const errorRate = (FailureCount || 0 / (SuccessCount || 0) + (FailureCount || 0)) * 100;
        if (
          errorRate > 5 &&
          (NotificationSentCount || 0) < 1 &&
          (SuccessCount || 0) + (FailureCount || 0) > 10
        ) {
          return sendAlert(event, hashKey, sortKey, result, alertsBaseStore, snsService);
        }
      })
    )
    .catch((error) =>
      throwError(`(Re)-Throwing error on purpose to notify of batch item failure`, error, {
        eventId: event.EventId
      })
    )
    .then();
}
