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

vi.mock('@services/sns');
vi.mock('@common/powertools');
vi.mock('@services/email');

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
    to: validEmail,
    subject: 'Some subject' as EmailSubject,
    htmlBody: '<h1>Hello my friend</h1>' as EmailHtmlBody,
    tags: ['OneTag'],
    subEventType: 'NoPhoneNumberForCalendarEventFound',
    inlineAttachments: {
      'logo.png': {
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

      const result = await testIt(
        validEvent,
        validSender,
        sendEmailSpy,
        safePublishSpy,
        emailingEnabled
      );

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
            'eyJkYXRhIjp7InRvIjoidGVzdEBub3RpZnljYWwuY29tIiwic3ViamVjdCI6IlNvbWUgc3ViamVjdCIsInRhZ3MiOlsiT25lVGFnIl0sInN1YkV2ZW50VHlwZSI6Ik5vUGhvbmVOdW1iZXJGb3JDYWxlbmRhckV2ZW50Rm91bmQiLCJtZXRhZGF0YSI6eyJhdHRyMSI6ImJsYSJ9fSwiY29ycmVsYXRpb25JZCI6IjBkZTY1MWVmLTUzNWUtNGQyZS1iOWZmLTdiZjQzZjVhYWFhYSIsImV2ZW50SWQiOiIwZGU2NTFlZi01MzVlLTRkMmUtYjlmZi03YmY0M2Y1YTAxYWMiLCJ1c2VySWQiOiIwZGU2NTFlZi01MzVlLTRkMmUtYjlmZi03YmY0M2Y1YTAwMDAiLCJpZHAiOiJnb29nbGUuY29tIiwiaWRwSWQiOiI0NTM0NjM1NjM1NiIsImV2ZW50VHlwZSI6IkVtYWlsVG9CZVNlbnQiLCJoYXBwZW5lZEF0IjoiMjAyNC0wMS0wMlQxNTowNDo1MFoifQ==',
          userId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0000'
        },
        validEvent.data.inlineAttachments,
        validEvent.data.tags
      );
      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validEvent,
        eventType: 'EmailToBeSentAttemptSent',
        data: {
          ...validEvent.data,
          vendorResponse: validEmailServiceResponse
        }
      });
      expect(loggerInfoSpy).toHaveBeenCalledWith('Sending an email through Mailgun');

      expect(loggerInfoSpy).toHaveBeenCalledWith('Attempt to publish an event');
    });

    it('should return a fake response when emailing is disabled', async () => {
      const emailingEnabled = false;
      const sendEmailSpy = vi.fn();
      const safePublishSpy = vi.fn().mockResolvedValue({});

      const result = await testIt(
        validEvent,
        validSender,
        sendEmailSpy,
        safePublishSpy,
        emailingEnabled
      );
      const expectedFakeResponse = { id: 'fake-uuid', message: 'OK!' };

      expect(result).toStrictEqual(expectedFakeResponse);
      expect(sendEmailSpy).not.toHaveBeenCalled();
      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validEvent,
        eventType: 'EmailToBeSentAttemptSent',
        data: {
          ...validEvent.data,
          vendorResponse: expectedFakeResponse
        }
      });
    });

    it('should return an error if email sending fails - let caller deal with it', async () => {
      const error = new Error('Booom!');
      const sendEmailSpy = vi.fn().mockRejectedValue(error);
      const safePublishSpy = vi.fn().mockResolvedValue({ $metadata: {} });

      const result = testIt(validEvent, validSender, sendEmailSpy, safePublishSpy, true);

      await expect(result).rejects.toThrow(error);
      expect(sendEmailSpy).toHaveBeenCalledOnce();
      expect(safePublishSpy).not.toHaveBeenCalled();
    });

    function testIt(
      event: EmailToBeSentEvent,
      from: EmailWithName,
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
      const snsService = SnsService.withConfig({} as SnsTopicConfig);
      vi.mocked(EmailService).mockReturnValue({
        sendEmail: sendEmailFn
      } as unknown as EmailService);

      const messageProcessor = new Processor(config.mailgunConfig, emailingEnabled, snsService);
      return messageProcessor.process(event, from);
    }
  });
});
