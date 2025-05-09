import type { Logger } from '@aws-lambda-powertools/logger';
import { environment } from '@common/powertools';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import {
  EventTypeDate,
  type AlertCounterKeyNames,
  type AlertStoreRecord
} from '@model/store/AlertStoreRecord';
import type { DateTime, Email, EventId, IdpName, UserId } from '@notifycal/shared/types';
import type { EmailHtmlBody, EmailSubject } from '@own-types/model';
import { throwError } from '@services/common/error-handling';
import type { SnsService } from '@services/sns';
import type { AlertsBaseStore } from '@services/stores/alerts-base-store';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { tap } from '@utils/promises';
import { DateTime as DT } from 'luxon';
import { match } from 'ts-pattern';
import { v4 } from 'uuid';
import type { AlertThresholdConfig } from './config';
import type {
  AuditTrailActionableEventFoundEvent,
  AuditTrailNoPhoneNumberForCalendarEventFoundEvent
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
  eventType:
    | AuditTrailActionableEventFoundEvent['EventType']
    | AuditTrailNoPhoneNumberForCalendarEventFoundEvent['EventType'],
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

function interpolateEmail(
  email: Email,
  updateCounterResult: AlertStoreRecord<EventTypeDate['value'], UserId>,
  errorRate: number
): EmailToBeSentEvent['data'] {
  const subEventType: EmailToBeSentEvent['data']['subEventType'] =
    'NoPhoneNumberForCalendarEventFound';
  return {
    to: email,
    subject: 'Missing phone numbers in your events' as EmailSubject,
    htmlBody:
      `<p>Attention, some of your calendar events have not got any attendee phone number. The failure count is: ${updateCounterResult.FailureCount}</p>` as EmailHtmlBody,
    tags: [environment, subEventType],
    subEventType,
    metadata: {
      actionableEventFoundCount: updateCounterResult.SuccessCount,
      noPhoneNumberForCalendarEventFoundCount: updateCounterResult.FailureCount,
      errorRate,
      notificationsSentCountBeforeUpdate: updateCounterResult.NotificationSentCount
    }
  };
}

function sendAlert(
  event: AuditTrailActionableEventFoundEvent | AuditTrailNoPhoneNumberForCalendarEventFoundEvent,
  hashKey: EventTypeDate,
  sortKey: UserId,
  email: Email,
  updateCounterResult: AlertStoreRecord<EventTypeDate['value'], UserId>,
  errorRate: number,
  alertsBaseStore: AlertsBaseStore,
  snsService: SnsService,
  logger: Logger
): Promise<void> {
  logger.info(`Sending alert to user`);
  const alertData = interpolateEmail(email, updateCounterResult, errorRate);
  const alertEvent: EmailToBeSentEvent = emailToBeSent(event, alertData);
  return snsService
    .publish(alertEvent)
    .then(tap(() => updateCounterOnAlertSent(hashKey, sortKey, alertsBaseStore)))
    .then();
}

function buildPersistanceKeys(
  event: AuditTrailActionableEventFoundEvent | AuditTrailNoPhoneNumberForCalendarEventFoundEvent
): {
  hashKey: EventTypeDate;
  sortKey: UserId;
} {
  const happenedAt = DT.fromISO(event.HappenedAt).toUTC();
  const hashKey = new EventTypeDate('NoPhoneNumberForCalendarEventFound', happenedAt);
  const sortKey = event.UserId;
  return { hashKey, sortKey };
}

function errorRate(successCount: number | undefined, failureCount: number | undefined): number {
  return ((failureCount || 0) / ((successCount || 0) + (failureCount || 0))) * 100;
}

function shouldAlert(
  result: AlertStoreRecord<EventTypeDate['value'], UserId>,
  errorRate: number,
  config: AlertThresholdConfig
): boolean {
  const { SuccessCount, FailureCount, NotificationSentCount } = result;
  const { errorRateThreshold, maxNotificationsPerDay, countThresholdToEnableTrigger } = config;
  return (
    errorRate > errorRateThreshold &&
    (NotificationSentCount || 0) < maxNotificationsPerDay &&
    (SuccessCount || 0) + (FailureCount || 0) >= countThresholdToEnableTrigger
  );
}

function errorHandler(eventId: EventId): (error: unknown) => Promise<void | undefined> {
  return (error: unknown) => {
    throwError(`(Re)-Throwing error on purpose to notify of batch item failure`, error, {
      eventId: eventId
    });
  };
}

export function recordProcessor(
  event: AuditTrailActionableEventFoundEvent | AuditTrailNoPhoneNumberForCalendarEventFoundEvent,
  config: AlertThresholdConfig,
  alertsBaseStore: AlertsBaseStore,
  userBaseStore: UserBaseStore<IdpName>,
  snsService: SnsService,
  logger: Logger
): Promise<void> {
  const { hashKey, sortKey } = buildPersistanceKeys(event);
  return updateCounterOnEventReceived(hashKey, sortKey, event.EventType, alertsBaseStore)
    .then((result) => {
      const _errorRate = errorRate(result.SuccessCount, result.FailureCount);
      if (shouldAlert(result, _errorRate, config)) {
        return userBaseStore.getEmailById(event.UserId).then((email) => {
          if (email) {
            return sendAlert(
              event,
              hashKey,
              sortKey,
              email,
              result,
              _errorRate,
              alertsBaseStore,
              snsService,
              logger
            );
          } else {
            logger.error(
              `Email alert could not be sent to user with id ${event.UserId} cause email was not found in persistance. Not retrying...`
            );
            return Promise.resolve();
          }
        });
      }
    })
    .catch(errorHandler(event.EventId))
    .then();
}
