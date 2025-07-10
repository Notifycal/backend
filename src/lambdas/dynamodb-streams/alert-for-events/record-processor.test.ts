import { logger } from '@common/powertools';
import { insufficientCreditsPartialTemplate } from '@email-templates/insufficient-credits/insufficient-credits.html.hbs';
import { specificTranslations as insufficientCreditsTranslations } from '@email-templates/insufficient-credits/translations';
import { lowCreditsDetectedPartialTemplate } from '@email-templates/low-credits-detected/low-credits-detected.html.hbs';
import { specificTranslations as lowCreditsTranslations } from '@email-templates/low-credits-detected/translations';
import type { Email, IdpName, LanguageCode } from '@notifycal/shared/types';
import type { AwsArn, EmailHtmlBody, EmailSubject } from '@own-types/model';
import { type EmailTemplateResult, EmailTemplateService } from '@services/email-template-service';
import type { SnsService } from '@services/sns';
import type { UserBaseStore } from '@services/stores/user-base-store';
import {
  insufficientCreditsReminderNotSentEvent,
  lowCreditsDetectedEvent
} from '@testing/data/app-events';
import { describe, expect, it, vi } from 'vitest';
import type { AlertForEventsConfig } from './config';
import { recordProcessor } from './record-processor';
import type {
  AuditTrailInsufficientCreditReminderNotSentEvent,
  AuditTrailLowCreditDetectedEvent
} from './schema';

vi.mock('@services/email-template-service');

describe(recordProcessor, () => {
  const validEmail = 'test@notifycal.com' as Email;
  const validLanguage = 'en' as LanguageCode;

  const validLowCreditsEvent: AuditTrailLowCreditDetectedEvent =
    lowCreditsDetectedEvent as AuditTrailLowCreditDetectedEvent;

  const validInsufficientCreditsEvent: AuditTrailInsufficientCreditReminderNotSentEvent =
    insufficientCreditsReminderNotSentEvent as AuditTrailInsufficientCreditReminderNotSentEvent;

  const validConfig: AlertForEventsConfig = {
    alertEmailConfig: {
      faqUrl: new URL('https://example.com/faq'),
      topupUrl: new URL('https://example.com/topup')
    },
    emailingSenderConfig: {
      sender: {
        email: 'sender@example.com' as Email,
        name: 'Sender Name'
      }
    },
    emailToBeSentTopicConfig: {
      topicArn: 'some-arn' as AwsArn
    },
    userBaseStoreConfig: {
      tableName: 'test-table'
    }
  };

  const validCompiledTemplate: EmailTemplateResult = {
    subject: 'Test Subject' as EmailSubject,
    htmlBody: '<p>Test Body</p>' as EmailHtmlBody,
    inlineAttachments: {}
  };

  it('processes LowCreditsDetected event successfully', async () => {
    const result = testIt(
      validLowCreditsEvent,
      () => Promise.resolve({ Email: validEmail, Language: validLanguage }),
      vi.fn().mockResolvedValue(undefined),
      () => () => validCompiledTemplate
    );

    await expect(result).resolves.toBeUndefined();
  });

  it('processes InsufficientCreditsReminderNotSent event successfully', async () => {
    const result = testIt(
      validInsufficientCreditsEvent,
      () => Promise.resolve({ Email: validEmail, Language: validLanguage }),
      vi.fn().mockResolvedValue(undefined),
      () => () => validCompiledTemplate
    );

    await expect(result).resolves.toBeUndefined();
  });

  it('handles user not found gracefully', async () => {
    const publishFn = vi.fn();
    await testIt(
      validLowCreditsEvent,
      () => Promise.resolve(undefined),
      publishFn,
      () => () => validCompiledTemplate
    );

    expect(publishFn).not.toHaveBeenCalled();
  });

  it('handles errors by rethrowing them', async () => {
    const error = new Error('Database error');
    const getEmailAndLanguageFn = () => Promise.reject(error);

    await expect(
      testIt(
        validLowCreditsEvent,
        getEmailAndLanguageFn,
        vi.fn(),
        () => () => validCompiledTemplate
      )
    ).rejects.toThrow(`(Re)-Throwing error on purpose to notify of batch item failure`);
  });

  it('uses correct template configuration for LowCreditsDetected', async () => {
    const mockCompileTemplate = vi.fn().mockReturnValue(() => validCompiledTemplate);
    await testIt(
      validLowCreditsEvent,
      () => Promise.resolve({ Email: validEmail, Language: validLanguage }),
      vi.fn().mockResolvedValue(undefined),
      mockCompileTemplate
    );

    expect(mockCompileTemplate).toHaveBeenCalledWith(
      lowCreditsDetectedPartialTemplate,
      lowCreditsTranslations,
      {
        topupUrl: validConfig.alertEmailConfig.topupUrl.toString()
      }
    );
  });

  it('uses correct template configuration for InsufficientCreditsReminderNotSent', async () => {
    const mockCompileTemplate = vi.fn().mockReturnValue(() => validCompiledTemplate);
    await testIt(
      validInsufficientCreditsEvent,
      () => Promise.resolve({ Email: validEmail, Language: validLanguage }),
      vi.fn().mockResolvedValue(undefined),
      mockCompileTemplate
    );

    expect(mockCompileTemplate).toHaveBeenCalledWith(
      insufficientCreditsPartialTemplate,
      insufficientCreditsTranslations,
      {
        topupUrl: validConfig.alertEmailConfig.topupUrl.toString()
      }
    );
  });

  it('generates correct EmailToBeSentEvent structure', async () => {
    const publishFn = vi.fn().mockResolvedValue(undefined);
    await testIt(
      validLowCreditsEvent,
      () => Promise.resolve({ Email: validEmail, Language: validLanguage }),
      publishFn,
      () => () => validCompiledTemplate
    );

    expect(publishFn).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        eventId: expect.any(String),
        correlationId: validLowCreditsEvent.CorrelationId,
        eventType: 'EmailToBeSent',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        happenedAt: expect.any(String),
        userId: validLowCreditsEvent.UserId,
        idp: validLowCreditsEvent.Idp,
        idpId: validLowCreditsEvent.IdpId,
        data: {
          from: validConfig.emailingSenderConfig.sender,
          to: validEmail,
          subject: validCompiledTemplate.subject,
          htmlBody: validCompiledTemplate.htmlBody,
          tags: [],
          subEventType: 'LowCreditsDetected',
          inlineAttachments: validCompiledTemplate.inlineAttachments,
          metadata: {
            eventType: 'LowCreditsDetected'
          }
        }
      })
    );
  });

  async function testIt(
    event: AuditTrailLowCreditDetectedEvent | AuditTrailInsufficientCreditReminderNotSentEvent,
    getEmailAndLanguageByIdFn: () => Promise<{ Email: Email; Language: LanguageCode } | undefined>,
    snsPublishFn: () => Promise<void>,
    compileTemplateFn: () => (language: LanguageCode) => EmailTemplateResult
  ): Promise<void> {
    const mockUserBaseStore = {
      getEmailAndLanguageById: vi.fn().mockImplementation(getEmailAndLanguageByIdFn)
    } as unknown as UserBaseStore<IdpName>;
    const mockSnsService = {
      publish: snsPublishFn
    } as unknown as SnsService;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(EmailTemplateService.prototype.compileTemplate).mockImplementation(compileTemplateFn);

    return recordProcessor(event, validConfig, mockUserBaseStore, mockSnsService, logger);
  }
});
