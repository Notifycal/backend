import type { Logger } from '@aws-lambda-powertools/logger';
import { logo } from '@email/assets/logo.png.base64';
import { baseTemplate } from '@email/templates/base/base-template.html.hbs';
import { commonTranslations } from '@email/templates/base/translations';
import type {
  EmailWithName,
  EventCreationOptions,
  EventSourceIdentity
} from '@model/app-events/common';
import { emailToBeSent, type EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailTemplateConfig, EmailTemplateResult } from '@model/Email';
import type { Email, LanguageCode } from '@notifycal/shared/types';
import type {
  ContentType,
  EmailHtmlBody,
  EmailInlineAttachementBase64,
  EmailSubject
} from '@own-types/model';
import juice from 'juice';
import { TemplateCompiler } from './template-compiler';

export class EmailTemplateService {
  private readonly templateCompiler: TemplateCompiler;

  public constructor(logger: Logger) {
    this.templateCompiler = new TemplateCompiler(logger);
  }

  private compileTemplate<TEmailTemplateData extends Record<string, string>>(
    partialTemplate: string,
    specificTranslations: Record<LanguageCode, TEmailTemplateData>,
    dynamicVariables: Record<string, string> = {}
  ): (language: LanguageCode) => EmailTemplateResult {
    this.templateCompiler.registerPartial('content', partialTemplate);
    const compiledTemplate = this.templateCompiler.compile(baseTemplate);

    return (language: LanguageCode): EmailTemplateResult => {
      const logoFilename = `logo.png`;
      const templateData: TEmailTemplateData = {
        ...commonTranslations[language],
        ...specificTranslations[language],
        logoSrc: `cid:${logoFilename}`,
        ...dynamicVariables
      };

      return {
        htmlBody: compiledTemplate(templateData) as EmailHtmlBody,
        subject: specificTranslations[language].subject as EmailSubject,
        inlineAttachments: {
          [logoFilename]: {
            type: 'inline',
            base64Content: logo as EmailInlineAttachementBase64,
            contentType: 'image/png' as ContentType
          }
        }
      };
    };
  }

  private interpolateEmail(
    email: Email,
    sender: EmailWithName,
    language: LanguageCode,
    templateConfig: EmailTemplateConfig,
    subEventType: EmailToBeSentEvent['data']['subEventType'],
    metadata: Record<string, string | number | undefined>
  ): EmailToBeSentEvent['data'] {
    const compiledTemplateFn = this.compileTemplate(
      templateConfig.partialTemplate,
      templateConfig.specificTranslations,
      templateConfig.dynamicVariables
    );
    const emailTemplate = compiledTemplateFn(language);

    return {
      from: sender,
      to: email,
      subject: emailTemplate.subject,
      htmlBody: juice(emailTemplate.htmlBody, {
        removeStyleTags: true,
        preserveImportant: true,
        inlinePseudoElements: true,
        resolveCSSVariables: true
      }) as EmailHtmlBody,
      tags: [],
      subEventType,
      inlineAttachments: emailTemplate.inlineAttachments,
      metadata
    };
  }

  public createEmailEvent(
    email: Email,
    sender: EmailWithName,
    language: LanguageCode,
    templateConfig: EmailTemplateConfig,
    subEventType: EmailToBeSentEvent['data']['subEventType'],
    metadata: Record<string, string | number | undefined>,
    userIdentity: EventSourceIdentity,
    options: EventCreationOptions
  ): EmailToBeSentEvent {
    const eventData = this.interpolateEmail(
      email,
      sender,
      language,
      templateConfig,
      subEventType,
      metadata
    );
    return emailToBeSent(userIdentity, eventData, options);
  }
}
