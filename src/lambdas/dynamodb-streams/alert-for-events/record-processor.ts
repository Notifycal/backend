import type { Logger } from '@aws-lambda-powertools/logger';
import { insufficientCreditsPartialTemplate } from '@email-templates/insufficient-credits/insufficient-credits.html.hbs';
import { specificTranslations as insufficientCreditsTranslations } from '@email-templates/insufficient-credits/translations';
import { lowCreditsDetectedPartialTemplate } from '@email-templates/low-credits-detected/low-credits-detected.html.hbs';
import { specificTranslations as lowCreditsTranslations } from '@email-templates/low-credits-detected/translations';
import type {
  EmailWithName,
  EventCreationOptions,
  EventSourceIdentity
} from '@model/app-events/common';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import { extractIdentity } from '@model/store/AuditTrailStoreRecord';
import type { Email, IdpName, LanguageCode } from '@notifycal/shared/types';
import type { SnsService } from '@services/sns';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { match } from 'ts-pattern';
import {
  errorHandler,
  interpolateEmailBase,
  sendAlert,
  type EmailTemplateConfig
} from '../shared/alert-processing';
import type { AlertForEventsConfig } from './config';
import type {
  AuditTrailInsufficientCreditReminderNotSentEvent,
  AuditTrailLowCreditDetectedEvent
} from './schema';

type AlertEventType = 'LowCreditsDetected' | 'InsufficientCreditsReminderNotSent';

function getEmailTemplateConfig(
  eventType: AlertEventType,
  config: AlertForEventsConfig
): EmailTemplateConfig {
  return match(eventType)
    .with('LowCreditsDetected', () => ({
      partialTemplate: lowCreditsDetectedPartialTemplate,
      specificTranslations: lowCreditsTranslations,
      templateVariables: {
        faqUrl: config.alertEmailConfig.faqUrl.toString(),
        topupUrl: config.alertEmailConfig.topupUrl.toString()
      }
    }))
    .with('InsufficientCreditsReminderNotSent', () => ({
      partialTemplate: insufficientCreditsPartialTemplate,
      specificTranslations: insufficientCreditsTranslations,
      templateVariables: {
        topupUrl: config.alertEmailConfig.topupUrl.toString()
      }
    }))
    .exhaustive();
}

function interpolateEmail(
  receiver: Email,
  sender: EmailWithName,
  language: LanguageCode,
  eventType: AlertEventType,
  config: AlertForEventsConfig,
  logger: Logger
): EmailToBeSentEvent['data'] {
  const templateConfig = getEmailTemplateConfig(eventType, config);

  return interpolateEmailBase(
    receiver,
    sender,
    language,
    templateConfig,
    eventType,
    { eventType },
    logger
  );
}

function sendCreditAlert(
  event: AuditTrailLowCreditDetectedEvent | AuditTrailInsufficientCreditReminderNotSentEvent,
  receiver: Email,
  sender: EmailWithName,
  language: LanguageCode,
  config: AlertForEventsConfig,
  snsService: SnsService,
  logger: Logger
): Promise<void> {
  logger.info(`Sending alert to user`, { eventType: event.EventType });
  const identity: EventSourceIdentity = extractIdentity(event);
  const options: EventCreationOptions = {
    correlationId: event.CorrelationId
  };
  const alertData = interpolateEmail(receiver, sender, language, event.EventType, config, logger);
  return sendAlert(identity, options, alertData, snsService);
}

export function recordProcessor(
  event: AuditTrailLowCreditDetectedEvent | AuditTrailInsufficientCreditReminderNotSentEvent,
  config: AlertForEventsConfig,
  userBaseStore: UserBaseStore<IdpName>,
  snsService: SnsService,
  logger: Logger
): Promise<void> {
  logger.info(`Processing alert event`, {
    eventType: event.EventType,
    userId: event.UserId
  });

  return userBaseStore
    .getEmailAndLanguageById(event.UserId)
    .then((emailAndLanguage) => {
      if (emailAndLanguage) {
        const { Email, Language } = emailAndLanguage;
        return sendCreditAlert(
          event,
          Email,
          config.emailingSenderConfig.sender,
          Language,
          config,
          snsService,
          logger
        );
      } else {
        logger.error(
          `Alert email could not be sent to user with id ${event.UserId} cause email was not found in persistance. Not retrying...`
        );
        return Promise.resolve();
      }
    })
    .catch(errorHandler(event.EventId, logger));
}
