import type { Logger } from '@aws-lambda-powertools/logger';
import { logo } from '@email-templates/assets/logo.png.base64';
import { baseTemplate } from '@email-templates/base-template.html.hbs';
import { commonTranslations } from '@email-templates/i18n/translations';
import type { LanguageCode } from '@notifycal/shared/types';
import type {
  ContentType,
  EmailHtmlBody,
  EmailInlineAttachementBase64,
  EmailSubject
} from '@own-types/model';
import { TemplateCompiler } from './template-compiler';

export interface EmailTemplateData {
  [key: string]: string | number | boolean | undefined;
}

export interface EmailAttachment {
  type: 'inline';
  base64Content: EmailInlineAttachementBase64;
  contentType: ContentType;
}

export interface EmailTemplateResult {
  htmlBody: EmailHtmlBody;
  subject: EmailSubject;
  inlineAttachments: Record<string, EmailAttachment>;
}

export class EmailTemplateService {
  private readonly templateCompiler: TemplateCompiler;

  public constructor(logger: Logger) {
    this.templateCompiler = new TemplateCompiler(logger);
  }

  public compileTemplate<TEmailTemplateData extends Record<string, string>>(
    partialTemplate: string,
    specificTranslations: Record<LanguageCode, TEmailTemplateData>,
    dynamicVariables: Record<string, string> = {}
  ): (language: LanguageCode) => EmailTemplateResult {
    this.templateCompiler.registerPartial('content', partialTemplate);
    const compiledTemplate = this.templateCompiler.compile(baseTemplate);

    return (language: LanguageCode): EmailTemplateResult => {
      const logoFilename = `logo.png`;
      const templateData: EmailTemplateData = {
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
}
