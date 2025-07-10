import { logger } from '@common/powertools';
import { logo } from '@email-templates/assets/logo.png.base64';
import { commonTranslations } from '@email-templates/i18n/translations';
import type { LanguageCode } from '@notifycal/shared/types';
import { describe, expect, it } from 'vitest';
import { EmailTemplateService } from './email-template-service';

const validPartialTemplate = `
<div class="content">
  <h1>{{header}}</h1>
  <p>{{message}}</p>
  <p>{{dynamicVar}}</p>
</div>
`;

interface TestTranslations extends Record<string, string> {
  subject: string;
  header: string;
  message: string;
}

const validSpecificTranslations: Record<LanguageCode, TestTranslations> = {
  en: {
    subject: 'Test Subject',
    header: 'Test Header',
    message: 'Test Message'
  },
  es: {
    subject: 'Asunto de Prueba',
    header: 'Encabezado de Prueba',
    message: 'Mensaje de Prueba'
  }
};

const validDynamicVariables = {
  dynamicVar: 'Dynamic Value'
};

describe(EmailTemplateService, () => {
  it('should compile template and return function', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate(
      validPartialTemplate,
      validSpecificTranslations,
      validDynamicVariables
    );

    expect(compiledTemplateFn).toBeInstanceOf(Function);
  });

  it('should generate email template with correct structure', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate(
      validPartialTemplate,
      validSpecificTranslations,
      validDynamicVariables
    );

    const result = compiledTemplateFn('en');

    expect(result).toStrictEqual({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      htmlBody: expect.any(String),
      subject: 'Test Subject',
      inlineAttachments: {
        'logo.png': {
          type: 'inline',
          base64Content: logo,
          contentType: 'image/png'
        }
      }
    });
  });

  it('should use baseTemplate HTML structure', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate(
      validPartialTemplate,
      validSpecificTranslations,
      validDynamicVariables
    );

    const result = compiledTemplateFn('en');

    expect(result.htmlBody).toContain('<!DOCTYPE html>');
    expect(result.htmlBody).toContain('<html>');
    expect(result.htmlBody).toContain('<head>');
    expect(result.htmlBody).toContain('<meta charset="UTF-8">');
    expect(result.htmlBody).toContain('<body>');
  });

  it('should use baseTemplate layout components', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate(
      validPartialTemplate,
      validSpecificTranslations,
      validDynamicVariables
    );

    const result = compiledTemplateFn('en');

    expect(result.htmlBody).toContain('<div class="pattern-bg">');
    expect(result.htmlBody).toContain('<div class="email-container">');
    expect(result.htmlBody).toContain('<div class="email-header">');
    expect(result.htmlBody).toContain('<div class="footer">');
    expect(result.htmlBody).toContain('&copy; 2025 Notifycal');
  });

  it('should use specific partial template content', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate(
      validPartialTemplate,
      validSpecificTranslations,
      validDynamicVariables
    );

    const result = compiledTemplateFn('en');

    expect(result.htmlBody).toContain('<div class="content">');
    expect(result.htmlBody).toContain('<h1>Test Header</h1>');
    expect(result.htmlBody).toContain('<p>Test Message</p>');
    expect(result.htmlBody).toContain('<p>Dynamic Value</p>');
  });

  it('should include common translations in template data', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate(
      '{{appName}} - {{rightsReserved}}',
      validSpecificTranslations,
      {}
    );

    const result = compiledTemplateFn('en');

    expect(result.htmlBody).toContain(commonTranslations.en.appName);
    expect(result.htmlBody).toContain(commonTranslations.en.rightsReserved);
  });

  it('should merge specific translations with common translations', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate(
      '{{appName}} - {{header}}',
      validSpecificTranslations,
      {}
    );

    const result = compiledTemplateFn('en');

    expect(result.htmlBody).toContain('Notifycal');
    expect(result.htmlBody).toContain('Test Header');
  });

  it('should apply dynamic variables to template', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate(
      '{{dynamicVar}}',
      validSpecificTranslations,
      validDynamicVariables
    );

    const result = compiledTemplateFn('en');

    expect(result.htmlBody).toContain('Dynamic Value');
  });

  it('should handle different languages correctly', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate('{{header}}', validSpecificTranslations, {});

    const englishResult = compiledTemplateFn('en');
    const spanishResult = compiledTemplateFn('es');

    expect(englishResult.subject).toBe('Test Subject');
    expect(spanishResult.subject).toBe('Asunto de Prueba');
    expect(englishResult.htmlBody).toContain('Test Header');
    expect(spanishResult.htmlBody).toContain('Encabezado de Prueba');
  });

  it('should set correct logoSrc for inline attachments', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate(
      '{{logoSrc}}',
      validSpecificTranslations,
      {}
    );

    const result = compiledTemplateFn('en');

    expect(result.htmlBody).toContain('cid:logo.png');
  });

  it('should override logoSrc when provided in dynamic variables', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate('{{logoSrc}}', validSpecificTranslations, {
      logoSrc: 'custom-logo-src'
    });

    const result = compiledTemplateFn('en');

    expect(result.htmlBody).toContain('custom-logo-src');
  });

  it('should work with empty dynamic variables', () => {
    const service = new EmailTemplateService(logger);

    const compiledTemplateFn = service.compileTemplate('{{header}}', validSpecificTranslations);

    const result = compiledTemplateFn('en');

    expect(result.subject).toBe('Test Subject');
    expect(result.htmlBody).toContain('Test Header');
  });
});
