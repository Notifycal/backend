import { logger } from '@common/powertools';
import { logo } from '@email-templates/assets/logo.png.base64';
import type { LanguageCode } from '@notifycal/shared/types';
import { EmailTemplateService } from '@services/email-template-service';
import { writeFileSync } from 'fs';
import path from 'path';
import { expect } from 'vitest';

export interface TestTemplateConfig {
  templateName: string;
  partialTemplate: string;
  specificTranslations: Record<LanguageCode, Record<string, string>>;
  dynamicVariables?: Record<string, string>;
  outputDirectory: string;
}

export function testEmailTemplate(config: TestTemplateConfig): void {
  const {
    templateName,
    partialTemplate,
    specificTranslations,
    dynamicVariables = {},
    outputDirectory
  } = config;

  const emailTemplateService = new EmailTemplateService(logger);

  const compiledTemplateFn = emailTemplateService.compileTemplate(
    partialTemplate,
    specificTranslations,
    {
      ...dynamicVariables,
      logoSrc: `data:image/png;base64,${logo}`
    }
  );

  expect(compiledTemplateFn).toBeInstanceOf(Function);

  const supportedLanguages: Array<LanguageCode> = ['en', 'es'];
  supportedLanguages.forEach((lang) => {
    const emailTemplate = compiledTemplateFn(lang);
    
    expect(emailTemplate).toHaveProperty('htmlBody');
    expect(emailTemplate).toHaveProperty('subject');
    expect(emailTemplate).toHaveProperty('inlineAttachments');
    
    expect(emailTemplate.htmlBody).toContain('<!DOCTYPE html');
    expect(emailTemplate.subject).toBeTruthy();
    
    writeFileSync(
      path.resolve(outputDirectory, `${templateName}.${lang}.html`),
      emailTemplate.htmlBody
    );
  });
}