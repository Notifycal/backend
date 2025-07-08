import { logger } from '@common/powertools';
import type { LanguageCode } from '@notifycal/shared/types';
import { EmailTemplateService } from '@services/email-template-service';
import { writeFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { alertMissingPhoneNumberPartialTemplate } from './alert-missing-phone-number.html.hbs';
import { specificTranslations } from './translations';

describe('alert-missing-phone-number template', () => {
  it('should compile the template', () => {
    const emailTemplateService = new EmailTemplateService(logger);

    const templateGenerator = emailTemplateService.compileTemplate(
      alertMissingPhoneNumberPartialTemplate,
      specificTranslations,
      {
        notifycalFaqUrl: 'https://notifycal.com/faq'
      }
    );

    expect(templateGenerator).toBeInstanceOf(Function);

    const supportedLanguages: Array<LanguageCode> = ['en', 'es'];
    supportedLanguages.forEach((lang) => {
      const emailTemplate = templateGenerator(lang);
      writeFileSync(
        path.resolve(__dirname, `alert-missing-phone-number.${lang}.html`),
        emailTemplate.htmlBody
      );
    });
  });
});
