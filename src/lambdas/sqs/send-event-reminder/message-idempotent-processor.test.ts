import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { MessagingEndpointConfig, MessagingTopicConfig } from '@model/Config';
import type { VonageEndpointConfig } from '@model/vendor/vonage';
import type {
  CalendarId,
  CalendarName,
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  TimeZone,
  UserId,
  Uuid
} from '@notifycal/shared/types';
import type { AwsArn, PhoneNumberE164, Url } from '@own-types/model';
import {
  MessagingService,
  type VonageApplicationId,
  type VonagePrivateKey
} from '@services/messaging';
import { SnsService } from '@services/sns';
import { validRecord as _validRecord } from '@testing/data/sqs-events';
import type {} from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { Record } from './index';
import MessageProcessor from './message-idempotent-processor';

vi.mock('@services/sns');
vi.mock('@common/powertools');
vi.mock('@services/messaging');
vi.mock('@aws-lambda-powertools/idempotency');

const defaultConfig: VonageEndpointConfig & MessagingTopicConfig & MessagingEndpointConfig = {
  vonageConfig: {
    applicationId: 'some app id' as VonageApplicationId,
    webhookBaseURL: 'https://test.com' as Url,
    privateKeySSMPath: 'some path',
    privateKey: 'some private key' as VonagePrivateKey
  },
  messagingTopicConfig: {
    topicArn: 'some aws arn' as AwsArn
  },
  messagingConfig: {
    enabled: true
  }
};

const validActionableEventEvent: ActionableEventFoundEvent = {
  data: {
    receiverDetails: {
      type: 'phone',
      phoneNumber: '+34123456789' as PhoneNumberE164,
      countryCode: 'ES'
    },
    run: {
      lowerBoundStartTime: '2023-01-01T00:00:00Z' as DateTime,
      upperBoundStartTime: '2023-01-01T00:29:59Z' as DateTime,
      slidingWindowInMinutes: 30
    },
    calendar: {
      id: 'some calendar id' as CalendarId,
      name: 'some calendar name' as CalendarName
    },
    calendarEvent: {
      id: 'event-1',
      attendees: [{ id: 'attendee@test.com' }],
      isAllDayEvent: false,
      startTime: '2024-01-02T15:05:00Z' as DateTime,
      timeZone: 'Europe/Madrid' as TimeZone
    },
    senderDetails: {
      type: 'phone',
      phoneNumber: '+34666999888' as PhoneNumberE164,
      countryCode: 'ES'
    },
    message: `This is some message`
  },
  correlationId: '0de651ef-535e-4d2e-b9ff-7bf43f5aaaaa' as CorrelationId,
  eventId: '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac' as EventId,
  userId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0000' as UserId,
  idp: 'google.com',
  idpId: '45346356356' as IdpId,
  eventType: 'ActionableEventFound',
  happenedAt: '2024-01-02T15:04:50Z' as DateTime
};
const validRecord = _validRecord(validActionableEventEvent);

describe('Messaging MessageProcessor', () => {
  const validWebhookUrl = 'https://webhook.example.com/callback' as Url;
  const validReturnedUuid = 'test-uuid-123' as Uuid;

  describe('sendReminder', () => {
    it('should send a message when messaging is enabled', async () => {
      const safePublishSpy = vi.fn().mockResolvedValue({ $metadata: {} });
      const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);

      const loggerAppendKeysSpy = vi.spyOn(logger, 'appendKeys');
      const loggerInfoSpy = vi.spyOn(logger, 'info');

      const result = await testIt(validRecord, validWebhookUrl, sendMessageSpy, safePublishSpy);

      expect(result).toStrictEqual(validReturnedUuid);
      expect(sendMessageSpy).toHaveBeenCalledWith(
        validRecord.body.data.message,
        validRecord.body.data.senderDetails,
        validRecord.body.data.receiverDetails,
        validRecord.body.correlationId,
        validWebhookUrl
      );
      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validRecord.body,
        eventType: 'ActionableEventReminderAttemptSent',
        data: {
          ...validRecord.body.data,
          messageUUID: validReturnedUuid
        }
      });
      expect(loggerAppendKeysSpy).toHaveBeenCalledWith({
        reminderMessage: validRecord.body.data.message,
        senderDetails: validRecord.body.data.senderDetails,
        receiverDetails: validRecord.body.data.receiverDetails
      });
      expect(loggerInfoSpy).toHaveBeenCalledWith('Sending a message through Vonage');
      // eslint-disable-next-line vitest/max-expects
      expect(loggerInfoSpy).toHaveBeenCalledWith('Attempt to publish an event');
    });

    it('should return a fake uuid when messaging is disabled', async () => {
      const disabledConfig: VonageEndpointConfig & MessagingTopicConfig & MessagingEndpointConfig =
        {
          ...defaultConfig,
          messagingConfig: {
            enabled: false
          }
        };
      const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);
      const safePublishSpy = vi.fn().mockResolvedValue({});

      const result = await testIt(
        validRecord,
        validWebhookUrl,
        sendMessageSpy,
        safePublishSpy,
        disabledConfig
      );

      expect(result).toBe('fake-uuid');
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validRecord.body,
        eventType: 'ActionableEventReminderAttemptSent',
        data: {
          ...validRecord.body.data,
          messageUUID: 'fake-uuid'
        }
      });
    });

    it('should return an error if message sending fails - let caller deal with it', async () => {
      const error = new Error('Booom!');
      const sendMessageSpy = vi.fn().mockRejectedValue(error);
      const safePublishSpy = vi.fn().mockResolvedValue({ $metadata: {} });

      const result = testIt(validRecord, validWebhookUrl, sendMessageSpy, safePublishSpy);

      await expect(result).rejects.toThrow(error);
      expect(sendMessageSpy).toHaveBeenCalledOnce();
      expect(safePublishSpy).not.toHaveBeenCalled();
    });

    function testIt(
      record: Record,
      webhookUrl: Url,
      sendMessageFn: () => Promise<Uuid>,
      safePublishFn: () => Promise<void>,
      config: VonageEndpointConfig & MessagingTopicConfig & MessagingEndpointConfig = defaultConfig
    ): Promise<Uuid> {
      vi.mocked(MessagingService).mockReturnValue({
        sendMessage: sendMessageFn
      } as unknown as MessagingService);

      const snsServiceMock = {
        safePublish: safePublishFn
      };
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(SnsService.withConfig).mockReturnValue(snsServiceMock as unknown as SnsService);

      const messageProcessor = new MessageProcessor(config);
      return messageProcessor.sendReminder(record, webhookUrl);
    }
  });

  describe('onIdempotencyHit', () => {
    it('should publish a reminder attempt skipped event', async () => {
      const safePublishSpy = vi.fn().mockResolvedValue({});
      vi.mocked(MessagingService).mockImplementation(
        () =>
          ({
            sendMessage: vi.fn()
          }) as unknown as MessagingService
      );

      await testIt(validRecord, validReturnedUuid, safePublishSpy);

      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validRecord.body,
        eventType: 'ActionableEventReminderAttemptSkipped',
        data: {
          ...validRecord.body.data,
          messageUUID: validReturnedUuid
        }
      });
    });

    function testIt(
      record: Record,
      messageUUID: Uuid,
      safePublishFn: () => Promise<void>,
      config: VonageEndpointConfig & MessagingTopicConfig & MessagingEndpointConfig = defaultConfig
    ): Promise<void> {
      const snsServiceMock = {
        safePublish: safePublishFn
      };
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(SnsService.withConfig).mockReturnValue(snsServiceMock as unknown as SnsService);
      const messageProcessor = new MessageProcessor(config);
      return messageProcessor.onIdempotencyHit(record, messageUUID);
    }
  });
});
