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
  TEmailTemplateData extends Record<string, string> = Record<string, string>
> {
  partialTemplate: string;
  specificTranslations: Record<LanguageCode, TEmailTemplateData>;
  templateVariables: Record<string, string>;
}
