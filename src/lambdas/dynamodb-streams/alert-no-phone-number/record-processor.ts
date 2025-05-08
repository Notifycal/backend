import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import {
  EventTypeDate,
  type AlertCounterKeyNames,
  type AlertNoPhoneNumberStoreRecord
} from '@model/store/AlertNoPhoneNumberStoreRecord';
import type { DateTime, Email, EventId, UserId } from '@notifycal/shared/types';
import type { EmailHtmlBody, EmailSubject } from '@own-types/model';
import { throwError } from '@services/common/error-handling';
import type { SnsService } from '@services/sns';
import type { AlertNoPhoneNumberBaseStore } from '@services/stores/alert-no-phone-number-store';
import { tap } from '@utils/promises';
import { DateTime as DT } from 'luxon';
import { match } from 'ts-pattern';
import { v4 } from 'uuid';
import type { z } from 'zod';
import type { payloadSchemas, Record } from './schema';

export function emailToBeSent(
  origin: z.infer<typeof payloadSchemas>,
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
  event: Record['NewImage'],
  hashKey: EventTypeDate,
  sortKey: UserId,
  updateCounterResult: AlertNoPhoneNumberStoreRecord<EventTypeDate['value'], UserId>,
  baseStore: AlertNoPhoneNumberBaseStore,
  snsService: SnsService
): Promise<void> {
  const alertData = {
    to: 'foobar@notifycal.com' as Email,
    subject: 'Un rabo' as EmailSubject,
    htmlBody: `<h1>Otro rabo</h1>` as EmailHtmlBody,
    tags: []
  };
  const alertEvent: EmailToBeSentEvent = emailToBeSent(event, alertData);
  return snsService
    .publish(alertEvent)
    .then(tap(() => updateCounterOnAlertSent(hashKey, sortKey, baseStore)))
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
  baseStore: AlertNoPhoneNumberBaseStore,
  snsService: SnsService
): Promise<void> {
  const event = record.NewImage;
  const { hashKey, sortKey } = buildPersistanceKeys(event);
  return updateCounterOnEventReceived(hashKey, sortKey, event.EventType, baseStore)
    .then(
      tap((result) => {
        const { SuccessCount, FailureCount, NotificationSentCount } = result;
        const errorRate = (FailureCount || 0 / (SuccessCount || 0) + (FailureCount || 0)) * 100;
        if (
          errorRate > 5 &&
          (NotificationSentCount || 0) < 1 &&
          (SuccessCount || 0) + (FailureCount || 0) > 10
        ) {
          return sendAlert(event, hashKey, sortKey, result, baseStore, snsService);
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
