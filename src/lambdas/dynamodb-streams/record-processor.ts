import { emailToBeSent, type EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import {
  EventTypeDate,
  type AlertCounterKeyNames,
  type AlertNoPhoneNumberStoreRecord
} from '@model/store/AlertNoPhoneNumberStoreRecord';
import type { Email, UserId } from '@notifycal/shared/types';
import type { EmailHtmlBody, EmailSubject } from '@own-types/model';
import type { SnsService } from '@services/sns';
import type { AlertNoPhoneNumberBaseStore } from '@services/stores/alert-no-phone-number-store';
import { tap } from '@utils/promises';
import { DateTime as DT } from 'luxon';
import { match } from 'ts-pattern';
import type { Record } from './schema';

function updateCounterOnEventReceived(
  hashKey: EventTypeDate,
  sortKey: UserId,
  eventType: Record['body']['eventType'],
  baseStore: AlertNoPhoneNumberBaseStore
): Promise<AlertNoPhoneNumberStoreRecord<EventTypeDate['value'], UserId>> {
  const counterToIncrement: AlertCounterKeyNames = match(eventType)
    .with('ActionableEventFound', () => 'SuccessCount' as const)
    .with('NoPhoneNumberForCalendarEventFound', () => 'FailureCount' as const)
    .exhaustive();
  return baseStore.incrementCounter<EventTypeDate['value'], UserId>(
    hashKey.value,
    sortKey,
    counterToIncrement
  );
}

function updateCounterOnAlertSent(
  hashKey: EventTypeDate,
  sortKey: UserId,
  baseStore: AlertNoPhoneNumberBaseStore
): Promise<AlertNoPhoneNumberStoreRecord<EventTypeDate['value'], UserId>> {
  return baseStore.incrementCounter<EventTypeDate['value'], UserId>(
    hashKey.value,
    sortKey,
    'NotificationSentCount'
  );
}

function sendAlert(
  event: Record['body'],
  hashKey: EventTypeDate,
  sortKey: UserId,
  updateCounterResult: AlertNoPhoneNumberStoreRecord<EventTypeDate['value'], UserId>,
  baseStore: AlertNoPhoneNumberBaseStore,
  snsService: SnsService
): Promise<void> {
  const alertData = {
    to: 'foobar@notifycal.com' as Email,
    subject: 'Un rabo' as EmailSubject,
    htmlBody:
      `<h1>Otro rabo. Durante el dia X has tenido ${updateCounterResult.FailureCount} eventos con un numero de telefono erroneo</h1>` as EmailHtmlBody,
    tags: []
  };
  const alertEvent: EmailToBeSentEvent = emailToBeSent(event, alertData);
  return snsService
    .publish(alertEvent)
    .then(tap(() => updateCounterOnAlertSent(hashKey, sortKey, baseStore)))
    .then();
}

function buildPersistanceKeys(event: Record['body']): { hashKey: EventTypeDate; sortKey: UserId } {
  const happenedAt = DT.fromISO(event.happenedAt).toUTC();
  const hashKey = new EventTypeDate(event.eventType, happenedAt);
  const sortKey = event.userId;
  return { hashKey, sortKey };
}

export function recordProcessor(
  record: Record,
  baseStore: AlertNoPhoneNumberBaseStore,
  snsService: SnsService
): Promise<void> {
  const event = record.body;
  const { hashKey, sortKey } = buildPersistanceKeys(event);
  return updateCounterOnEventReceived(hashKey, sortKey, event.eventType, baseStore)
    .then(
      tap((result) => {
        const { SuccessCount, FailureCount, NotificationSentCount } = result;
        const errorRate = (FailureCount || 0 / (SuccessCount || 0) + (FailureCount || 0)) * 100;
        if (
          errorRate > 5 &&
          (NotificationSentCount || 0) < 1 &&
          (SuccessCount || 0) + (FailureCount || 0)
        ) {
          return sendAlert(event, hashKey, sortKey, result, baseStore, snsService);
        }
      })
    )
    .then();
}
