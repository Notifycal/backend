import type { LanguageCode } from '@notifycal/shared/types';
import type {
  ContentType,
  EmailHtmlBody,
  EmailInlineAttachementBase64,
  EmailSubject
} from '@own-types/model';

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

export interface EmailTemplateConfig<
  TEmailTemplateData extends Record<string, string> = Record<string, string>,
  TDynamicVariables extends Record<string, string> = Record<string, string>
> {
  partialTemplate: string;
  specificTranslations: Record<LanguageCode, TEmailTemplateData>;
  dynamicVariables: TDynamicVariables;
}

export class EmailTemplate<
  TEmailTextVariables extends Record<string, string>,
  TEmailDynamicVariables extends Record<string, string>
> {
  public constructor(
    private readonly partialTemplate: string,
    private readonly specificTranslations: Record<LanguageCode, TEmailTextVariables>
  ) {}

  public withDynamicVariables(
    dynamicVariables: TEmailDynamicVariables
  ): EmailTemplateConfig<TEmailTextVariables, TEmailDynamicVariables> {
    return {
      partialTemplate: this.partialTemplate,
      specificTranslations: this.specificTranslations,
      dynamicVariables: dynamicVariables
    };
  }
}
