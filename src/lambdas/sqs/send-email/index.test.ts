import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
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
import { validRawRecord as _validRawRecord } from '@testing/data/sqs-events';
import {
  setEnvEmailingConfig,
  setEnvEmailingTopicConfig,
  setEnvIdempotencyPersistanceConfig,
  setEnvMaigunConfig
} from '@testing/utils/config';
import type { Context, SQSEvent, SQSRecord } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { SendEmailConfig } from './config';
import { IdempotentProcessor } from './idempotent-processor';
// @ts-expect-error cjs handler export
import { handler, type Event } from './index';

vi.mock('./idempotent-processor');

const validSender: EmailWithName = {
  name: 'Notifycal Dev',
  email: 'test@notifycal.dev' as Email
};

const validEmail = 'test@notifycal.com' as Email;
const validEvent: EmailToBeSentEvent = {
  data: {
    from: validSender,
    to: validEmail,
    subject: 'Some subject' as EmailSubject,
    htmlBody: '<h1>Hello my friend</h1>' as EmailHtmlBody,
    tags: ['OneTag'],
    subEventType: 'NoPhoneNumberForCalendarEventFound',
    inlineAttachments: {
      'isologo.png': {
        type: 'inline',
        contentType: 'images/png' as ContentType,
        base64Content: 'ewrgwergwergwrg' as EmailInlineAttachementBase64
      }
    },
    metadata: {
      attr1: 'something'
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
const validRawRecord: SQSRecord = _validRawRecord(validEvent);
const validSqsEvent: SQSEvent = {
  Records: [validRawRecord]
};

const validEmailServiceResponse = {
  id: 'test-uuid-123',
  message: 'Thanks!'
};

describe('Send email lambda', () => {
  it('should process and return a success response if successful', async () => {
    const processIdempotentlyFn = vi.fn(() => Promise.resolve(validEmailServiceResponse));

    const result = await testit(validSqsEvent, processIdempotentlyFn);

    expect(result).toStrictEqual(validEmailServiceResponse);
    expect(processIdempotentlyFn).toHaveBeenCalledWith(validEvent);
  });

  it('should return an error if an email fails to be sent', async () => {
    const error = new Error('Booom!');
    const processIdempotentlyFn = vi.fn(() => Promise.reject(error));

    const result = testit(validSqsEvent, processIdempotentlyFn);

    await expect(result).rejects.toThrow(error);
    expect(processIdempotentlyFn).toHaveBeenCalledWith(validEvent);
  });
});

function testit(
  event: SQSEvent,
  sendEmailIndempotentlyFn: () => Promise<EmailSendSuccessResponse>,
  config: SendEmailConfig = defaultConfig
): Promise<EmailSendSuccessResponse> {
  setEnv(config);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(IdempotentProcessor.prototype.sendEmailIdempotently).mockImplementation(
    sendEmailIndempotentlyFn
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return handler(event as unknown as Event, {} as Context);
}

const defaultConfig: SendEmailConfig = {
  mailgunConfig: {
    apiKey: 'some api key',
    baseUrl: 'https://some-url.com' as Url,
    domainName: 'someDomainName.com'
  },
  idempotencyPersistenceConfig: {
    tableName: 'some table name',
    keyAttr: 'some key attr',
    expiryAttr: 'some expiryAttr',
    inProgressExpiryAttr: 'some in progress expiryAttr',
    statusAttr: 'some status Attr',
    dataAttr: 'some data attr',
    validationKeyAttr: 'some validation key attr'
  },
  emailingTopicConfig: {
    topicArn: 'some topic arn' as AwsArn
  },
  emailingConfig: {
    enabled: true
  }
};

function setEnv(config: SendEmailConfig): void {
  setEnvEmailingConfig(config.emailingConfig);
  setEnvMaigunConfig(config.mailgunConfig);
  setEnvEmailingTopicConfig(config.emailingTopicConfig);
  setEnvIdempotencyPersistanceConfig(config);
}
