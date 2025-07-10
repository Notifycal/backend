import type { Logger } from '@aws-lambda-powertools/logger';
import { insufficientCreditsPartialTemplate } from '@email-templates/insufficient-credits/insufficient-credits.html.hbs';
import { specificTranslations as insufficientCreditsTranslations } from '@email-templates/insufficient-credits/translations';
import { lowCreditsDetectedPartialTemplate } from '@email-templates/low-credits-detected/low-credits-detected.html.hbs';
import { specificTranslations as lowCreditsTranslations } from '@email-templates/low-credits-detected/translations';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type {
  DateTime,
  Email,
  EventId,
  IdpName,
  LanguageCode
} from '@notifycal/shared/types';
import { rethrowError } from '@services/common/error-handling';
import { EmailTemplateService } from '@services/email-template-service';
import type { SnsService } from '@services/sns';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { match } from 'ts-pattern';
import { v4 } from 'uuid';
import type { AlertForEventsConfig } from './config';
import type {
  AuditTrailInsufficientCreditReminderNotSentEvent,
  AuditTrailLowCreditDetectedEvent
} from './schema';

function emailToBeSent(
  origin: AuditTrailLowCreditDetectedEvent | AuditTrailInsufficientCreditReminderNotSentEvent,
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

interface EmailTemplateConfig {
  partialTemplate: string;
  specificTranslations: Record<string, Record<string, string>>;
  templateVariables?: Record<string, string>;
}

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
  const emailTemplateService = new EmailTemplateService(logger);
  const templateConfig = getEmailTemplateConfig(eventType, config);

  const compiledTemplateFn = emailTemplateService.compileTemplate(
    templateConfig.partialTemplate,
    templateConfig.specificTranslations,
    templateConfig.templateVariables || {}
  );
  const emailTemplate = compiledTemplateFn(language);

  return {
    from: sender,
    to: receiver,
    subject: emailTemplate.subject,
    htmlBody: emailTemplate.htmlBody,
    tags: [],
    subEventType: eventType,
    inlineAttachments: emailTemplate.inlineAttachments,
    metadata: {
      eventType: eventType
    }
  };
}

function sendAlert(
  event: AuditTrailLowCreditDetectedEvent | AuditTrailInsufficientCreditReminderNotSentEvent,
  receiver: Email,
  sender: EmailWithName,
  language: LanguageCode,
  config: AlertForEventsConfig,
  snsService: SnsService,
  logger: Logger
): Promise<void> {
  logger.info(`Sending alert to user`, { eventType: event.EventType });
  const alertData = interpolateEmail(receiver, sender, language, event.EventType, config, logger);
  const alertEvent: EmailToBeSentEvent = emailToBeSent(event, alertData);

  return snsService.publish(alertEvent).then();
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
        return sendAlert(
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
