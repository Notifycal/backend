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

function getLowCreditsTemplateConfig(config: AlertForEventsConfig): EmailTemplateConfig {
  return {
    partialTemplate: lowCreditsDetectedPartialTemplate,
    specificTranslations: lowCreditsTranslations,
    templateVariables: {
      faqUrl: config.alertEmailConfig.faqUrl.toString(),
      topupUrl: config.alertEmailConfig.topupUrl.toString()
    }
  };
}

function getInsufficientCreditsTemplateConfig(config: AlertForEventsConfig): EmailTemplateConfig {
  return {
    partialTemplate: insufficientCreditsPartialTemplate,
    specificTranslations: insufficientCreditsTranslations,
    templateVariables: {
      topupUrl: config.alertEmailConfig.topupUrl.toString()
    }
  };
}

function processAlertEvent(
  event: AuditTrailLowCreditDetectedEvent | AuditTrailInsufficientCreditReminderNotSentEvent,
  receiver: Email,
  sender: EmailWithName,
  language: LanguageCode,
  templateConfig: EmailTemplateConfig,
  snsService: SnsService,
  logger: Logger
): Promise<void> {
  logger.info(`Processing alert event`, { eventType: event.EventType });

  const identity: EventSourceIdentity = extractIdentity(event);
  const options: EventCreationOptions = {
    correlationId: event.CorrelationId
  };

  const alertData = interpolateEmailBase(
    receiver,
    sender,
    language,
    templateConfig,
    event.EventType,
    { eventType: event.EventType },
    logger
  );

  return sendAlert(identity, options, alertData, snsService);
}

function processEventWithEmailTemplate(
  event: AuditTrailLowCreditDetectedEvent | AuditTrailInsufficientCreditReminderNotSentEvent,
  templateConfig: EmailTemplateConfig,
  config: AlertForEventsConfig,
  userBaseStore: UserBaseStore<IdpName>,
  snsService: SnsService,
  logger: Logger
): Promise<void> {
  return userBaseStore
    .getEmailAndLanguageById(event.UserId)
    .then((emailAndLanguage) => {
      if (emailAndLanguage) {
        const { Email, Language } = emailAndLanguage;
        return processAlertEvent(
          event,
          Email,
          config.emailingSenderConfig.sender,
          Language,
          templateConfig,
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

  const templateConfig = match(event.EventType)
    .with('LowCreditsDetected', () => getLowCreditsTemplateConfig(config))
    .with('InsufficientCreditsReminderNotSent', () => getInsufficientCreditsTemplateConfig(config))
    .exhaustive();

  return processEventWithEmailTemplate(
    event,
    templateConfig,
    config,
    userBaseStore,
    snsService,
    logger
  );
}
