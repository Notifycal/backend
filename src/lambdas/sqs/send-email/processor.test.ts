import { logger } from '@common/powertools';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailingTopicConfig, SnsTopicConfig } from '@model/Config';
import type { MailgunEndpointConfig } from '@model/vendor/mailgun/config';
import type { EmailSendSuccessResponse } from '@model/vendor/mailgun/schemas';
import type {
  CorrelationId,
  DateTime,
  Email,
  EventId,
  IdpId,
  UserId
} from '@notifycal/shared/types';
import type {
  AwsArn,
  ContentType,
  EmailHtmlBody,
  EmailInlineAttachementBase64,
  EmailSubject,
  Url
} from '@own-types/model';
import { EmailService } from '@services/email';
import { SnsService } from '@services/sns';
import { describe, expect, it, vi } from 'vitest';
import { Processor } from './processor';

vi.mock(import('@services/sns'));
vi.mock(import('@common/powertools'));
vi.mock(import('@services/email'));

const defaultConfig: MailgunEndpointConfig & EmailingTopicConfig = {
  mailgunConfig: {
    apiKey: 'some api key',
    baseUrl: 'https://some-url.com' as Url,
    domainName: 'someDomainName.com'
  },
  emailingTopicConfig: {
    topicArn: 'some aws arn' as AwsArn
  }
};

const validEmail = 'test@notifycal.com' as Email;
const validSender: EmailWithName = {
  name: 'Notifycal',
  email: 'test@notifycal.com' as Email
};

const validEvent: EmailToBeSentEvent = {
  data: {
    from: validSender,
    to: validEmail,
    subject: 'Some subject' as EmailSubject,
    htmlBody: '<h1>Hello my friend</h1>' as EmailHtmlBody,
    tags: [],
    subEventType: 'NoPhoneNumberForCalendarEventFound',
    inlineAttachments: {
      'isologo.png': {
        type: 'inline',
        contentType: 'images/png' as ContentType,
        base64Content: 'ewrgwergwergwrg' as EmailInlineAttachementBase64
      }
    },
    metadata: {
      attr1: 'bla'
    }
  },
  correlationId: '0de651ef-535e-4d2e-b9ff-7bf43f5aaaaa' as CorrelationId,
  eventId: '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac' as EventId,
  userId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0000' as UserId,
  idp: 'google.com',
  idpId: '45346356356' as IdpId,
  eventType: 'EmailToBeSent',
  happenedAt: '2024-01-02T15:04:50Z' as DateTime
};

describe('Email processor', () => {
  const validEmailServiceResponse = {
    id: 'test-uuid-123',
    message: 'Thanks!'
  };

  describe('process', () => {
    it('should send an email when emailing is enabled', async () => {
      const sendEmailSpy = vi.fn().mockResolvedValue(validEmailServiceResponse);
      const safePublishSpy = vi.fn().mockResolvedValue({ $metadata: {} });
      const loggerInfoSpy = vi.spyOn(logger, 'info');
      const emailingEnabled = true;

      const result = await testIt(validEvent, sendEmailSpy, safePublishSpy, emailingEnabled);

      expect(result).toStrictEqual(validEmailServiceResponse);
      expect(sendEmailSpy).toHaveBeenCalledWith(
        validSender,
        validEvent.data.to,
        validEvent.data.subject,
        validEvent.data.htmlBody,
        {
          correlationId: '0de651ef-535e-4d2e-b9ff-7bf43f5aaaaa',
          eventId: '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac',
          eventType: 'EmailToBeSent',
          happenedAt: '2024-01-02T15:04:50Z',
          idp: 'google.com',
          idpId: '45346356356',
          originalBase64Event:
            'eyJkYXRhIjp7ImZyb20iOnsibmFtZSI6Ik5vdGlmeWNhbCIsImVtYWlsIjoidGVzdEBub3RpZnljYWwuY29tIn0sInRvIjoidGVzdEBub3RpZnljYWwuY29tIiwic3ViamVjdCI6IlNvbWUgc3ViamVjdCIsInRhZ3MiOltdLCJzdWJFdmVudFR5cGUiOiJOb1Bob25lTnVtYmVyRm9yQ2FsZW5kYXJFdmVudEZvdW5kIiwibWV0YWRhdGEiOnsiYXR0cjEiOiJibGEifX0sImNvcnJlbGF0aW9uSWQiOiIwZGU2NTFlZi01MzVlLTRkMmUtYjlmZi03YmY0M2Y1YWFhYWEiLCJldmVudElkIjoiMGRlNjUxZWYtNTM1ZS00ZDJlLWI5ZmYtN2JmNDNmNWEwMWFjIiwidXNlcklkIjoiMGRlNjUxZWYtNTM1ZS00ZDJlLWI5ZmYtN2JmNDNmNWEwMDAwIiwiaWRwIjoiZ29vZ2xlLmNvbSIsImlkcElkIjoiNDUzNDYzNTYzNTYiLCJldmVudFR5cGUiOiJFbWFpbFRvQmVTZW50IiwiaGFwcGVuZWRBdCI6IjIwMjQtMDEtMDJUMTU6MDQ6NTBaIn0=',
          userId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0000'
        },
        validEvent.data.inlineAttachments,
        validEvent.data.tags.concat(['NoPhoneNumberForCalendarEventFound'])
      );
      expect(safePublishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: validEvent.userId,
          idp: validEvent.idp,
          idpId: validEvent.idpId,
          correlationId: validEvent.correlationId,
          eventType: 'EmailToBeSentAttemptSent',
          data: {
            ...validEvent.data,
            vendorResponse: validEmailServiceResponse
          }
        })
      );
      expect(loggerInfoSpy).toHaveBeenCalledWith('Sending an email through Mailgun');
      expect(loggerInfoSpy).toHaveBeenCalledWith('Attempt to publish an event');
    });

    it('should return a fake response when emailing is disabled', async () => {
      const emailingEnabled = false;
      const sendEmailSpy = vi.fn();
      const safePublishSpy = vi.fn().mockResolvedValue({});

      const result = await testIt(validEvent, sendEmailSpy, safePublishSpy, emailingEnabled);
      const expectedFakeResponse = { id: 'fake-uuid', message: 'OK!' };

      expect(result).toStrictEqual(expectedFakeResponse);
      expect(sendEmailSpy).not.toHaveBeenCalled();
      expect(safePublishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: validEvent.userId,
          idp: validEvent.idp,
          idpId: validEvent.idpId,
          correlationId: validEvent.correlationId,
          eventType: 'EmailToBeSentAttemptSent',
          data: {
            ...validEvent.data,
            vendorResponse: expectedFakeResponse
          }
        })
      );
    });

    it('should return an error if email sending fails - let caller deal with it', async () => {
      const error = new Error('Booom!');
      const sendEmailSpy = vi.fn().mockRejectedValue(error);
      const safePublishSpy = vi.fn().mockResolvedValue({ $metadata: {} });

      const result = testIt(validEvent, sendEmailSpy, safePublishSpy, true);

      await expect(result).rejects.toThrow(error);
      expect(sendEmailSpy).toHaveBeenCalledOnce();
      expect(safePublishSpy).not.toHaveBeenCalled();
    });

    function testIt(
      event: EmailToBeSentEvent,
      sendEmailFn: () => Promise<EmailSendSuccessResponse>,
      safePublishFn: () => Promise<void>,
      emailingEnabled: boolean,
      config: MailgunEndpointConfig = defaultConfig
    ): Promise<EmailSendSuccessResponse> {
      const snsServiceMock = {
        safePublish: safePublishFn
      };
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(SnsService.withConfig).mockReturnValue(snsServiceMock as unknown as SnsService);
      const snsService = SnsService.withConfig({} as SnsTopicConfig, logger);
      vi.mocked(EmailService).mockImplementation(function () {
        return {
          sendEmail: sendEmailFn
        } as unknown as EmailService;
      });

      const messageProcessor = new Processor(
        config.mailgunConfig,
        emailingEnabled,
        snsService,
        logger
      );
      return messageProcessor.process(event);
    }
  });
});
