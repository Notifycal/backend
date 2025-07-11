import { logger } from '@common/powertools';
import { logo } from '@email/assets/logo.png.base64';
import type { EmailTemplateConfig } from '@model/Email';
import type { CorrelationId, Email, IdpId, LanguageCode, UserId } from '@notifycal/shared/types';
import { EmailTemplateService } from '@services/email-template-service';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { alertMissingPhoneNumberPartialTemplate } from './alert-missing-phone-number/alert-missing-phone-number.html.hbs';
import { specificTranslations as alertMissingPhoneNumberTranslations } from './alert-missing-phone-number/translations';
import { insufficientCreditsPartialTemplate } from './insufficient-credits/insufficient-credits.html.hbs';
import { specificTranslations as insufficientCreditsTranslations } from './insufficient-credits/translations';
import { lowCreditsDetectedPartialTemplate } from './low-credits-detected/low-credits-detected.html.hbs';
import { specificTranslations as lowCreditsDetectedTranslations } from './low-credits-detected/translations';

const topupUrl = 'https://app.notifycal.com/billing';

const templates = [
  {
    name: 'low-credits-detected',
    partialTemplate: lowCreditsDetectedPartialTemplate,
    specificTranslations: lowCreditsDetectedTranslations,
    templateVariables: { topupUrl }
  },
  {
    name: 'insufficient-credits',
    partialTemplate: insufficientCreditsPartialTemplate,
    specificTranslations: insufficientCreditsTranslations,
    templateVariables: { topupUrl }
  },
  {
    name: 'alert-missing-phone-number',
    partialTemplate: alertMissingPhoneNumberPartialTemplate,
    specificTranslations: alertMissingPhoneNumberTranslations,
    templateVariables: { notifycalFaqUrl: 'https://notifycal.com/faq' }
  }
];

describe('all email templates', () => {
  // eslint-disable-next-line vitest/require-hook
  templates.forEach(({ name, partialTemplate, specificTranslations, templateVariables }) => {
    // eslint-disable-next-line vitest/expect-expect
    it(`should compile the ${name} template`, () => {
      testEmailTemplate(
        name,
        {
          partialTemplate,
          specificTranslations,
          templateVariables: { ...templateVariables, logoSrc: `data:image/png;base64,${logo}` } //Override logoSrc template variable slightly differenty to be able to render it.
        },
        __dirname + '/dist'
      );
    });
  });
});

export function testEmailTemplate(
  templateName: string,
  templateConfig: EmailTemplateConfig,
  outputDirectory: string
): void {
  const emailTemplateService = new EmailTemplateService(logger);

  const supportedLanguages: Array<LanguageCode> = ['en', 'es'];
  supportedLanguages.forEach((lang) => {
    const emailEvent = emailTemplateService.createEmailEvent(
      'test@example.com' as Email,
      { name: 'Test Sender', email: 'sender@example.com' as Email },
      lang,
      templateConfig,
      'LowCreditsDetected',
      {},
      { userId: 'test-user' as UserId, idp: 'google.com', idpId: 'srvbgrgr' as IdpId },
      { correlationId: 'test-correlation' as CorrelationId }
    );

    const emailData = emailEvent.data;

    expect(emailData).toHaveProperty('htmlBody');
    expect(emailData).toHaveProperty('subject');
    expect(emailData).toHaveProperty('inlineAttachments');

    expect(emailData.htmlBody).toContain('<!DOCTYPE html');
    expect(emailData.subject).toStrictEqual(expect.any(String));

    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(
      path.resolve(outputDirectory, `${templateName}.${lang}.html`),
      emailData.htmlBody
    );
  });
}
