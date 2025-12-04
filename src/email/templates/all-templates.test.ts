import { logger } from '@common/powertools';
import { isologo } from '@email/assets/isologo.base64';
import { doIUseEmail } from '@jsx-email/doiuse-email';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailTemplateConfig } from '@model/Email';
import type { CorrelationId, Email, IdpId, LanguageCode, UserId } from '@notifycal/shared/types';
import type { EmailSubject } from '@own-types/model';
import { EmailService } from '@services/email';
import { EmailTemplateService } from '@services/email-template-service';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { alertMissingPhoneNumberTemplate } from './alert-missing-phone-number/translations';
import { insufficientCreditsTemplate } from './insufficient-credits/translations';
import { lowCreditsDetectedTemplate } from './low-credits-detected/translations';

const sendTestingEmail = false; // Toggle to send real emails and be able to test it on a email client. Remember setting up the real api key if true.
const apiKey = `replace with real api key. NEVER EVER COMMIT IT`;
const validEmailTo = `test@gmail.com` as Email;

const billingUrl = 'https://app.notifycal.com/billing';
const feedbackUrl = 'https://app.notifycal.com/feedback';
const logoOverride = {
  logoSrc: `data:image/png;base64,${isologo}` //Override logoSrc template variable slightly differenty to be able to render it on a browser.
};

const templates = [
  {
    name: 'LowCreditsDetected' as const,
    template: lowCreditsDetectedTemplate.withDynamicVariables({
      billingUrl,
      feedbackUrl,
      ...(sendTestingEmail ? {} : logoOverride)
    })
  },
  {
    name: 'InsufficientCreditsReminderNotSent' as const,
    template: insufficientCreditsTemplate.withDynamicVariables({
      billingUrl,
      feedbackUrl,
      ...(sendTestingEmail ? {} : logoOverride)
    })
  },
  {
    name: 'NoPhoneNumberForCalendarEventFound' as const,
    template: alertMissingPhoneNumberTemplate.withDynamicVariables({
      notifycalFaqUrl: 'https://notifycal.com/#faq',
      feedbackUrl,
      ...(sendTestingEmail ? {} : logoOverride)
    })
  }
];

describe('all email templates', () => {
  // eslint-disable-next-line vitest/require-hook
  templates.forEach(({ name, template }) => {
    const supportedLanguages: Array<LanguageCode> = ['en', 'es', 'ca'];
    supportedLanguages.forEach((lang) => {
      // eslint-disable-next-line vitest/expect-expect
      it(`should compile the ${name} template in ${lang}`, async () => {
        await testEmailTemplate(name, template, lang, __dirname + '/dist');
      });
    });
  });
});

async function testEmailTemplate(
  templateName: EmailToBeSentEvent['data']['subEventType'],
  templateConfig: EmailTemplateConfig,
  lang: LanguageCode,
  outputDirectory: string
): Promise<void> {
  const emailTemplateService = new EmailTemplateService(logger);
  const emailEvent = emailTemplateService.createEmailEvent(
    'test@example.com' as Email,
    { name: 'Test Sender', email: 'sender@example.com' as Email },
    lang,
    templateConfig,
    templateName,
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
  writeFileSync(path.resolve(outputDirectory, `${templateName}.${lang}.html`), emailData.htmlBody);

  return sendTestingEmail ? sendEmail(emailEvent) : Promise.resolve();
}

function validateEmailCompatibility(htmlBody: string): void {
  const compatibilityResult = doIUseEmail(htmlBody, {
    emailClients: ['gmail.*', 'outlook.*', 'apple-mail.*', 'yahoo.*', 'thunderbird.*']
  });
  if (!compatibilityResult.success) {
    const criticalErrors = compatibilityResult.errors.filter((error: string) => {
      const lowercaseError = error.toLowerCase();

      const errorWhitelist = [
        'class selector` is not supported by `gmail.mobile-webmail',
        'border-radius` is not supported by `outlook.windows',
        '<body> element` is not supported'
      ];

      const isWhitelisted = errorWhitelist.some((whitelistItem) =>
        lowercaseError.includes(whitelistItem.toLowerCase())
      );
      return !isWhitelisted;
    });

    if (criticalErrors.length > 0) {
      console.warn('Critical email compatibility errors (not whitelisted) found:');
      criticalErrors.forEach((error: string, index: number) => {
        console.warn(`${index + 1}. ${error}`);
      });
    }

    // eslint-disable-next-line vitest/max-expects
    expect(criticalErrors).toHaveLength(0);
  }
}

export async function sendEmail(event: EmailToBeSentEvent): Promise<void> {
  const validSender: EmailWithName = {
    name: 'Unit Test',
    email: 'info@nonprod.notifycal.com' as Email
  };
  const service = new EmailService(
    `https://api.eu.mailgun.net`,
    `nonprod.notifycal.com`,
    apiKey,
    logger
  );
  await service
    .sendEmail(
      validSender,
      validEmailTo,
      `Testing ${event.data.subEventType}` as EmailSubject,
      event.data.htmlBody,
      {},
      event.data.inlineAttachments
    )
    .then();
}
