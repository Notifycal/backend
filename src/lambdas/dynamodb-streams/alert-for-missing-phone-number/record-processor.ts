import type { Logger } from '@aws-lambda-powertools/logger';
import { alertMissingPhoneNumberPartialTemplate } from '@email-templates/alert-missing-phone-number/alert-missing-phone-number.html.hbs';
import { specificTranslations } from '@email-templates/alert-missing-phone-number/translations';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailingSenderEndpointConfig } from '@model/Config';
import {
  EventTypeDate,
  type AlertCounterKeyNames,
  type AlertStoreRecord
} from '@model/store/AlertStoreRecord';
import type {
  DateTime,
  Email,
  EventId,
  IdpName,
  LanguageCode,
  UserId
} from '@notifycal/shared/types';
import { rethrowError } from '@services/common/error-handling';
import { EmailTemplateService } from '@services/email-template-service';
import type { SnsService } from '@services/sns';
import type { AlertsBaseStore } from '@services/stores/alerts-base-store';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { tap } from '@utils/promises';
import { DateTime as DT } from 'luxon';
import { match } from 'ts-pattern';
import { v4 } from 'uuid';
import type { AlertEmailConfig, AlertEndpointConfig, AlertThresholdConfig } from './config';
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
  sender: EmailWithName,
  language: LanguageCode,
  updateCounterResult: AlertStoreRecord<EventTypeDate['value'], UserId>,
  errorRate: number,
  alertEmailConfig: AlertEmailConfig,
  logger: Logger
): EmailToBeSentEvent['data'] {
  const subEventType: EmailToBeSentEvent['data']['subEventType'] =
    'NoPhoneNumberForCalendarEventFound';

  const emailTemplateService = new EmailTemplateService(logger);
  const compiledTemplateFn = emailTemplateService.compileTemplate(
    alertMissingPhoneNumberPartialTemplate,
    specificTranslations,
    {
      notifycalFaqUrl: alertEmailConfig.faqUrl.toString()
    }
  );
  const emailTemplate = compiledTemplateFn(language);

  return {
    from: sender,
    to: email,
    subject: emailTemplate.subject,
    htmlBody: emailTemplate.htmlBody,
    tags: [],
    subEventType,
    inlineAttachments: emailTemplate.inlineAttachments,
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
  sender: EmailWithName,
  language: LanguageCode,
  updateCounterResult: AlertStoreRecord<EventTypeDate['value'], UserId>,
  errorRate: number,
  alertEmailConfig: AlertEmailConfig,
  alertsBaseStore: AlertsBaseStore,
  snsService: SnsService,
  logger: Logger
): Promise<void> {
  logger.info(`Sending alert to user`);
  const alertData = interpolateEmail(
    email,
    sender,
    language,
    updateCounterResult,
    errorRate,
    alertEmailConfig,
    logger
  );
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

function errorHandler(
  eventId: EventId,
  logger: Logger
): (error: unknown) => Promise<void | undefined> {
  return (error: unknown) => {
    rethrowError(`(Re)-Throwing error on purpose to notify of batch item failure`, error, logger, {
      eventId: eventId
    });
  };
}

export function recordProcessor(
  event: AuditTrailActionableEventFoundEvent | AuditTrailNoPhoneNumberForCalendarEventFoundEvent,
  config: AlertEndpointConfig & EmailingSenderEndpointConfig,
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
    .then((updateCounterResult) => {
      const _errorRate = errorRate(
        updateCounterResult.SuccessCount,
        updateCounterResult.FailureCount
      );
      if (shouldAlert(updateCounterResult, _errorRate, config.alertThresholdConfig)) {
        return userBaseStore.getEmailAndLanguageById(event.UserId).then((emailAndLanguage) => {
          if (emailAndLanguage) {
            const { Email, Language } = emailAndLanguage;
            return sendAlert(
              event,
              alertName,
              alertDiscriminator,
              Email,
              config.emailingSenderConfig.sender,
              Language,
              updateCounterResult,
              _errorRate,
              config.alertEmailConfig,
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
      return Promise.resolve();
    })
    .catch(errorHandler(event.EventId, logger));
}
