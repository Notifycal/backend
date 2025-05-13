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
  alertName: EventTypeDate,
  alertDiscriminator: UserId,
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
    alertName.value,
    alertDiscriminator,
    counterToIncrement
  );
}

function updateCounterOnAlertSent(
  alertName: EventTypeDate,
  alertDiscriminator: UserId,
  alertsBaseStore: AlertsBaseStore
): Promise<AlertStoreRecord<EventTypeDate['value'], UserId>> {
  return alertsBaseStore.incrementCounter<EventTypeDate['value'], UserId>(
    alertName.value,
    alertDiscriminator,
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
    subject: 'Aviso importante: Recordatorios de calendario no enviados' as EmailSubject,
    htmlBody:
      `<p><strong>Atención:</strong> No pudimos encontrar números de teléfono para enviar recordatorios para ${updateCounterResult.FailureCount} evento(s) de tu calendario.</p>` as EmailHtmlBody,
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
  alertName: EventTypeDate,
  alertDiscriminator: UserId,
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
    .then(tap(() => updateCounterOnAlertSent(alertName, alertDiscriminator, alertsBaseStore)))
    .then();
}

function buildPersistanceKeys(
  event: AuditTrailActionableEventFoundEvent | AuditTrailNoPhoneNumberForCalendarEventFoundEvent
): {
  alertName: EventTypeDate;
  alertDiscriminator: UserId;
} {
  const happenedAt = DT.fromISO(event.HappenedAt).toUTC();
  const alertName = new EventTypeDate('NoPhoneNumberForCalendarEventFound', happenedAt);
  const alertDiscriminator = event.UserId;
  return { alertName, alertDiscriminator };
}

export function errorRate(successCount: number = 0, failureCount: number = 0): number {
  return (failureCount / (successCount + failureCount)) * 100 || 0;
}

function shouldAlert(
  result: AlertStoreRecord<EventTypeDate['value'], UserId>,
  errorRate: number,
  config: AlertThresholdConfig
): boolean {
  const { SuccessCount = 0, FailureCount = 0, NotificationSentCount = 0 } = result;
  const { errorRateThreshold, maxNotificationsPerDay, countThresholdToEnableTrigger } = config;
  return (
    errorRate > errorRateThreshold &&
    NotificationSentCount < maxNotificationsPerDay &&
    SuccessCount + FailureCount >= countThresholdToEnableTrigger
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
  const { alertName, alertDiscriminator } = buildPersistanceKeys(event);
  return updateCounterOnEventReceived(
    alertName,
    alertDiscriminator,
    event.EventType,
    alertsBaseStore
  )
    .then((result) => {
      const _errorRate = errorRate(result.SuccessCount, result.FailureCount);
      if (shouldAlert(result, _errorRate, config)) {
        return userBaseStore.getEmailById(event.UserId).then((email) => {
          if (email) {
            return sendAlert(
              event,
              alertName,
              alertDiscriminator,
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
