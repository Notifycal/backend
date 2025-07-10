import type { Logger } from '@aws-lambda-powertools/logger';
import type {
  EmailWithName,
  EventCreationOptions,
  EventSourceIdentity
} from '@model/app-events/common';
import { emailToBeSent, type EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { Email, EventId, LanguageCode } from '@notifycal/shared/types';
import { rethrowError } from '@services/common/error-handling';
import { EmailTemplateService } from '@services/email-template-service';
import type { SnsService } from '@services/sns';

export interface EmailTemplateConfig<
  TEmailTemplateData extends Record<string, string> = Record<string, string>
> {
  partialTemplate: string;
  specificTranslations: Record<LanguageCode, TEmailTemplateData>;
  templateVariables: Record<string, string>;
}

export function interpolateEmailBase(
  email: Email,
  sender: EmailWithName,
  language: LanguageCode,
  templateConfig: EmailTemplateConfig,
  subEventType: EmailToBeSentEvent['data']['subEventType'],
  metadata: Record<string, unknown>,
  logger: Logger
): EmailToBeSentEvent['data'] {
  const emailTemplateService = new EmailTemplateService(logger);
  const compiledTemplateFn = emailTemplateService.compileTemplate(
    templateConfig.partialTemplate,
    templateConfig.specificTranslations,
    templateConfig.templateVariables
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
    metadata
  };
}

export function sendAlert(
  identity: EventSourceIdentity,
  options: EventCreationOptions,
  alertData: EmailToBeSentEvent['data'],
  snsService: SnsService
): Promise<void> {
  const alertEvent: EmailToBeSentEvent = emailToBeSent(identity, alertData, options);
  return snsService.publish(alertEvent).then();
}

export function errorHandler(
  eventId: EventId,
  logger: Logger
): (error: unknown) => Promise<void | undefined> {
  return (error: unknown) => {
    rethrowError(`(Re)-Throwing error on purpose to notify of batch item failure`, error, logger, {
      eventId: eventId
    });
  };
}
