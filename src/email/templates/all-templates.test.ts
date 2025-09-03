import { logger } from '@common/powertools';
import { logo } from '@email/assets/logo.png.base64';
import { doIUseEmail } from '@jsx-email/doiuse-email';
import type { EmailTemplateConfig } from '@model/Email';
import type { CorrelationId, Email, IdpId, LanguageCode, UserId } from '@notifycal/shared/types';
import { EmailTemplateService } from '@services/email-template-service';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { alertMissingPhoneNumberTemplate } from './alert-missing-phone-number/translations';
import { insufficientCreditsTemplate } from './insufficient-credits/translations';
import { lowCreditsDetectedTemplate } from './low-credits-detected/translations';

const billingUrl = 'https://app.notifycal.com/billing';
const feedbackUrl = 'https://app.notifycal.com/feedback';
const logoOverride = {
  logoSrc: `data:image/png;base64,${logo}` //Override logoSrc template variable slightly differenty to be able to render it.
};

const templates = [
  {
    name: 'low-credits-detected',
    template: lowCreditsDetectedTemplate.withDynamicVariables({
      billingUrl,
      feedbackUrl,
      ...logoOverride
    })
  },
  {
    name: 'insufficient-credits',
    template: insufficientCreditsTemplate.withDynamicVariables({
      billingUrl,
      feedbackUrl,
      ...logoOverride
    })
  },
  {
    name: 'alert-missing-phone-number',
    template: alertMissingPhoneNumberTemplate.withDynamicVariables({
      notifycalFaqUrl: 'https://notifycal.com/faq',
      feedbackUrl,
      ...logoOverride
    })
  }
];

function validateEmailCompatibility(htmlBody: string): void {
  const compatibilityResult = doIUseEmail(htmlBody, {
    emailClients: ['gmail.*', 'outlook.*', 'apple-mail.*', 'yahoo.*', 'thunderbird.*']
  });
  if (!compatibilityResult.success) {
    const criticalErrors = compatibilityResult.errors.filter((error: string) => {
      const lowercaseError = error.toLowerCase();
      const isWhitelisted =
        lowercaseError.includes('<body> element') || lowercaseError.includes('border-radius');
      return !isWhitelisted;
    });

    if (criticalErrors.length > 0) {
      console.warn('Critical email compatibility errors (not whitelisted) found:');
      criticalErrors.forEach((error: string, index: number) => {
        console.warn(`${index + 1}. ${error}`);
      });
    }

    expect(criticalErrors).toHaveLength(0);
  }
}

describe('all email templates', () => {
  // eslint-disable-next-line vitest/require-hook
  templates.forEach(({ name, template }) => {
    // eslint-disable-next-line vitest/expect-expect
    it(`should compile the ${name} template`, () => {
      testEmailTemplate(name, template, __dirname + '/dist');
    });
  });
});

export function testEmailTemplate(
  templateName: string,
  templateConfig: EmailTemplateConfig,
  outputDirectory: string
): void {
  const emailTemplateService = new EmailTemplateService(logger);

  const supportedLanguages: Array<LanguageCode> = ['en', 'es', 'ca'];
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

    validateEmailCompatibility(emailData.htmlBody);

    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(
      path.resolve(outputDirectory, `${templateName}.${lang}.html`),
      emailData.htmlBody
    );
  });
}
