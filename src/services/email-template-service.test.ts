import { logger } from '@common/powertools';
import { logo } from '@email/assets/logo.png.base64';
import { commonTranslations } from '@email/templates/base/translations';
import type { EventCreationOptions, EventSourceIdentity } from '@model/app-events/common';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailTemplateConfig } from '@model/Email';
import type { CorrelationId, Email, IdpId, LanguageCode, UserId } from '@notifycal/shared/types';
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
  },
  ca: {
    subject: 'Asunt d Prueba',
    header: 'Encabezadot d Prueba',
    message: 'Mensag d Prueba'
  }
};

const validDynamicVariables = {
  dynamicVar: 'Dynamic Value'
};

const validTemplateConfig: EmailTemplateConfig = {
  partialTemplate: validPartialTemplate,
  specificTranslations: validSpecificTranslations,
  dynamicVariables: validDynamicVariables
};

const validEmail = 'test@example.com' as Email;
const validSender = { email: 'sender@example.com' as Email, name: 'Test Sender' };
const validIdentity: EventSourceIdentity = {
  userId: 'test-user' as UserId,
  idp: 'google.com',
  idpId: 'test-id' as IdpId
};
const validOptions: EventCreationOptions = {
  correlationId: 'test-correlation' as CorrelationId
};
const validSubEventType: EmailToBeSentEvent['data']['subEventType'] = 'LowCreditsDetected';

describe(EmailTemplateService, () => {
  it('should create email event with correct structure', () => {
    const service = new EmailTemplateService(logger);

    const emailEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      validTemplateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(emailEvent).toHaveProperty('eventType', 'EmailToBeSent');
    expect(emailEvent).toHaveProperty('data');
    expect(emailEvent.data).toHaveProperty('htmlBody');
    expect(emailEvent.data).toHaveProperty('subject');
    expect(emailEvent.data).toHaveProperty('inlineAttachments');
  });

  it('should generate email template with correct structure', () => {
    const service = new EmailTemplateService(logger);

    const emailEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      validTemplateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(emailEvent.data).toStrictEqual({
      from: validSender,
      to: validEmail,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      htmlBody: expect.any(String),
      subject: 'Test Subject',
      tags: [],
      subEventType: validSubEventType,
      inlineAttachments: {
        'logo.png': {
          type: 'inline',
          base64Content: logo,
          contentType: 'image/png'
        }
      },
      metadata: {}
    });
  });

  it('should use baseTemplate HTML structure', () => {
    const service = new EmailTemplateService(logger);

    const emailEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      validTemplateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(emailEvent.data.htmlBody).toContain('<!DOCTYPE html>');
    expect(emailEvent.data.htmlBody).toContain('<html>');
    expect(emailEvent.data.htmlBody).toContain('<head>');
    expect(emailEvent.data.htmlBody).toContain('<meta charset="UTF-8">');
    expect(emailEvent.data.htmlBody).toContain('<body>');
  });

  it('should use baseTemplate layout components', () => {
    const service = new EmailTemplateService(logger);

    const emailEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      validTemplateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(emailEvent.data.htmlBody).toContain('<div class="pattern-bg">');
    expect(emailEvent.data.htmlBody).toContain('<div class="email-container">');
    expect(emailEvent.data.htmlBody).toContain('<div class="email-header">');
    expect(emailEvent.data.htmlBody).toContain('<div class="footer">');
    expect(emailEvent.data.htmlBody).toContain('&copy; 2025 Notifycal');
  });

  it('should use specific partial template content', () => {
    const service = new EmailTemplateService(logger);

    const emailEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      validTemplateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(emailEvent.data.htmlBody).toContain('<div class="content">');
    expect(emailEvent.data.htmlBody).toContain('<h1>Test Header</h1>');
    expect(emailEvent.data.htmlBody).toContain('<p>Test Message</p>');
    expect(emailEvent.data.htmlBody).toContain('<p>Dynamic Value</p>');
  });

  it('should include common translations in template data', () => {
    const service = new EmailTemplateService(logger);
    const templateConfig: EmailTemplateConfig = {
      partialTemplate: '{{appName}} - {{rightsReserved}}',
      specificTranslations: validSpecificTranslations,
      dynamicVariables: {}
    };

    const emailEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      templateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(emailEvent.data.htmlBody).toContain(commonTranslations.en.appName);
    expect(emailEvent.data.htmlBody).toContain(commonTranslations.en.rightsReserved);
  });

  it('should merge specific translations with common translations', () => {
    const service = new EmailTemplateService(logger);
    const templateConfig: EmailTemplateConfig = {
      partialTemplate: '{{appName}} - {{header}}',
      specificTranslations: validSpecificTranslations,
      dynamicVariables: {}
    };

    const emailEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      templateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(emailEvent.data.htmlBody).toContain('Notifycal');
    expect(emailEvent.data.htmlBody).toContain('Test Header');
  });

  it('should apply dynamic variables to template', () => {
    const service = new EmailTemplateService(logger);
    const templateConfig: EmailTemplateConfig = {
      partialTemplate: '{{dynamicVar}}',
      specificTranslations: validSpecificTranslations,
      dynamicVariables: validDynamicVariables
    };

    const emailEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      templateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(emailEvent.data.htmlBody).toContain('Dynamic Value');
  });

  it('should handle different languages correctly', () => {
    const service = new EmailTemplateService(logger);
    const templateConfig: EmailTemplateConfig = {
      partialTemplate: '{{header}}',
      specificTranslations: validSpecificTranslations,
      dynamicVariables: {}
    };

    const englishEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      templateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    const spanishEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'es',
      templateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(englishEvent.data.subject).toBe('Test Subject');
    expect(spanishEvent.data.subject).toBe('Asunto de Prueba');
    expect(englishEvent.data.htmlBody).toContain('Test Header');
    expect(spanishEvent.data.htmlBody).toContain('Encabezado de Prueba');
  });

  it('should set correct logoSrc for inline attachments', () => {
    const service = new EmailTemplateService(logger);
    const templateConfig: EmailTemplateConfig = {
      partialTemplate: '{{logoSrc}}',
      specificTranslations: validSpecificTranslations,
      dynamicVariables: {}
    };

    const emailEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      templateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(emailEvent.data.htmlBody).toContain('cid:logo.png');
  });

  it('should override logoSrc when provided in dynamic variables', () => {
    const service = new EmailTemplateService(logger);
    const templateConfig: EmailTemplateConfig = {
      partialTemplate: '{{logoSrc}}',
      specificTranslations: validSpecificTranslations,
      dynamicVariables: { logoSrc: 'custom-logo-src' }
    };

    const emailEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      templateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(emailEvent.data.htmlBody).toContain('custom-logo-src');
  });

  it('should work with empty dynamic variables', () => {
    const service = new EmailTemplateService(logger);
    const templateConfig: EmailTemplateConfig = {
      partialTemplate: '{{header}}',
      specificTranslations: validSpecificTranslations,
      dynamicVariables: {}
    };

    const emailEvent = service.createEmailEvent(
      validEmail,
      validSender,
      'en',
      templateConfig,
      validSubEventType,
      {},
      validIdentity,
      validOptions
    );

    expect(emailEvent.data.subject).toBe('Test Subject');
    expect(emailEvent.data.htmlBody).toContain('Test Header');
  });
});
