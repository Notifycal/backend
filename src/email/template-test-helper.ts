import { logger } from '@common/powertools';
import type { EmailTemplateConfig } from '@model/Email';
import type { CorrelationId, Email, IdpId, LanguageCode, UserId } from '@notifycal/shared/types';
import { EmailTemplateService } from '@services/email-template-service';
import { writeFileSync } from 'fs';
import path from 'path';
import { expect } from 'vitest';

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
    expect(emailData.subject).toBeTruthy();

    writeFileSync(
      path.resolve(outputDirectory, `${templateName}.${lang}.html`),
      emailData.htmlBody
    );
  });
}
