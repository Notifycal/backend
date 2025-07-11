import type { Logger } from '@aws-lambda-powertools/logger';
import { alertMissingPhoneNumberPartialTemplate } from '@email/templates/alert-missing-phone-number/alert-missing-phone-number.html.hbs';
import { specificTranslations } from '@email/templates/alert-missing-phone-number/translations';
import type {
  EmailWithName,
  EventCreationOptions,
  EventSourceIdentity
} from '@model/app-events/common';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailingSenderEndpointConfig } from '@model/Config';
import type { EmailTemplateConfig } from '@model/Email';
import {
  EventTypeDate,
  type AlertCounterKeyNames,
  type AlertStoreRecord
} from '@model/store/AlertStoreRecord';
import { extractIdentity } from '@model/store/AuditTrailStoreRecord';
import type { Email, IdpName, LanguageCode, UserId } from '@notifycal/shared/types';
import { rethrowErrorHandler } from '@services/common/error-handling';
import { EmailTemplateService } from '@services/email-template-service';
import type { SnsService } from '@services/sns';
import type { AlertsBaseStore } from '@services/stores/alerts-base-store';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { tap } from '@utils/promises';
import { DateTime as DT } from 'luxon';
import { match } from 'ts-pattern';
import type {
  AlertEmailConfig,
  AlertEmailEndpointConfig,
  AlertEndpointConfig,
  AlertThresholdConfig
} from './config';
import type {
  AuditTrailActionableEventFoundEvent,
  AuditTrailNoPhoneNumberForCalendarEventFoundEvent
} from './schema';

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

function createEmailEvent(
  event: AuditTrailActionableEventFoundEvent | AuditTrailNoPhoneNumberForCalendarEventFoundEvent,
  email: Email,
  sender: EmailWithName,
  language: LanguageCode,
  updateCounterResult: AlertStoreRecord<EventTypeDate['value'], UserId>,
  errorRate: number,
  alertEmailConfig: AlertEmailConfig,
  logger: Logger
): EmailToBeSentEvent {
  const subEventType: EmailToBeSentEvent['data']['subEventType'] =
    'NoPhoneNumberForCalendarEventFound';
  const templateConfig: EmailTemplateConfig = {
    partialTemplate: alertMissingPhoneNumberPartialTemplate,
    specificTranslations: specificTranslations,
    templateVariables: {
      notifycalFaqUrl: alertEmailConfig.faqUrl.toString()
    }
  };
  const metadata = {
    actionableEventFoundCount: updateCounterResult.SuccessCount,
    noPhoneNumberForCalendarEventFoundCount: updateCounterResult.FailureCount,
    errorRate,
    notificationsSentCountBeforeUpdate: updateCounterResult.NotificationSentCount
  };
  const identity: EventSourceIdentity = extractIdentity(event);
  const options: EventCreationOptions = {
    correlationId: event.CorrelationId
  };

  return new EmailTemplateService(logger).createEmailEvent(
    email,
    sender,
    language,
    templateConfig,
    subEventType,
    metadata,
    identity,
    options
  );
}

function sendPhoneNumberAlert(
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
  const alertEvent = createEmailEvent(
    event,
    email,
    sender,
    language,
    updateCounterResult,
    errorRate,
    alertEmailConfig,
    logger
  );

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

export function recordProcessor(
  event: AuditTrailActionableEventFoundEvent | AuditTrailNoPhoneNumberForCalendarEventFoundEvent,
  config: AlertEndpointConfig & EmailingSenderEndpointConfig & AlertEmailEndpointConfig,
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
            return sendPhoneNumberAlert(
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
    .catch(
      rethrowErrorHandler(
        `(Re)-Throwing error on purpose to notify of batch item failure`,
        logger,
        {
          eventId: event.EventId
        }
      )
    );
}
