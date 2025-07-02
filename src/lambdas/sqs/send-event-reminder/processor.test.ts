import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import type { CreditServiceEndpointConfig, SnsTopicConfig } from '@model/Config';
import { InsufficientCreditsError } from '@model/Errors';
import type { VonageEndpointConfig } from '@model/vendor/vonage/config';
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
import type { PhoneNumberE164, Url } from '@own-types/model';
import {
  CreditsService,
  type CreditDeductionInsufficientCreditsError,
  type CreditDeductionResult,
  type CreditDeductionSuccess,
  type CreditDeductionUnexpectedError
} from '@services/credits-service';
import {
  MessagingService,
  type VonageApplicationId,
  type VonagePrivateKey
} from '@services/messaging';
import { SnsService } from '@services/sns';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { describe, expect, it, vi } from 'vitest';
import Processor from './processor';

vi.mock('@services/sns');
vi.mock('@common/powertools', () => {
  const mockLogger = Object.create(Logger.prototype) as LoggerInterface;
  mockLogger.appendKeys = vi.fn();
  mockLogger.info = vi.fn();
  mockLogger.error = vi.fn();
  mockLogger.warn = vi.fn();
  mockLogger.debug = vi.fn();

  return {
    logger: mockLogger
  };
});
vi.mock('@services/messaging');
vi.mock('@services/credits-service');

const defaultConfig: VonageEndpointConfig & CreditServiceEndpointConfig = {
  vonageConfig: {
    applicationId: 'some app id' as VonageApplicationId,
    webhookBaseURL: 'https://test.com' as Url,
    privateKeySSMPath: 'some path',
    privateKey: 'some private key' as VonagePrivateKey
  },
  countryToSMSCostCreditsMap: {
    ES: 7
  }
};

const validEvent: ActionableEventFoundEvent = {
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

const validCreditDeductionSuccess: CreditDeductionSuccess = {
  success: true,
  operationId: 'Success',
  subscriptionCreditBalance: 400,
  topupCreditBalance: 5
};

describe('Messaging processor', () => {
  const validReturnedUuid = 'test-uuid-123' as Uuid;

  describe('process', () => {
    it('should send a message when messaging is enabled', async () => {
      const safePublishSpy = vi.fn().mockResolvedValue({ $metadata: {} });
      const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);
      const messagingEnabled = true;
      const deductCreditsFn = vi.fn().mockResolvedValue(validCreditDeductionSuccess);

      const loggerAppendKeysSpy = vi.spyOn(logger, 'appendKeys');
      const loggerInfoSpy = vi.spyOn(logger, 'info');

      const result = await testIt(
        validEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn,
        messagingEnabled
      );

      expect(result).toStrictEqual(validReturnedUuid);
      expect(sendMessageSpy).toHaveBeenCalledWith(
        validEvent.data.message,
        validEvent.data.senderDetails,
        validEvent.data.receiverDetails,
        validEvent.correlationId,
        // eslint-disable-next-line vitest/no-conditional-expect
        expect.stringContaining(defaultConfig.vonageConfig.webhookBaseURL) &&
          // eslint-disable-next-line vitest/no-conditional-expect
          expect.stringContaining('data%5Bmessage%5D=This%20is%20some%20message')
      );
      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validEvent,
        eventType: 'ActionableEventReminderAttemptSent',
        data: {
          ...validEvent.data,
          messageUUID: validReturnedUuid
        }
      });
      expect(loggerAppendKeysSpy).toHaveBeenCalledWith({
        reminderMessage: validEvent.data.message,
        senderDetails: validEvent.data.senderDetails,
        receiverDetails: validEvent.data.receiverDetails
      });
      expect(loggerInfoSpy).toHaveBeenCalledWith('Sending a message through Vonage');
      // eslint-disable-next-line vitest/max-expects
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        'Publishing an event indicating the attempt to send a message'
      );
    });

    it('should deduct credits when a message is sent', async () => {
      const safePublishSpy = vi.fn().mockResolvedValue({ $metadata: {} });
      const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);
      const messagingEnabled = true;
      const deductCreditsFn = vi.fn().mockResolvedValue(validCreditDeductionSuccess);

      const result = await testIt(
        validEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn,
        messagingEnabled
      );

      expect(result).toStrictEqual(validReturnedUuid);
      expect(deductCreditsFn).toHaveBeenCalledWith(
        validEvent.userId,
        1,
        'ES',
        defaultConfig.countryToSMSCostCreditsMap
      );
    });

    it('should return a fake uuid when messaging is disabled', async () => {
      const messagingEnabled = false;
      const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);
      const safePublishSpy = vi.fn().mockResolvedValue({});
      const deductCreditsFn = vi.fn().mockResolvedValue(validCreditDeductionSuccess);

      const result = await testIt(
        validEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn,
        messagingEnabled
      );

      expect(result).toBe('fake-uuid');
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validEvent,
        eventType: 'ActionableEventReminderAttemptSent',
        data: {
          ...validEvent.data,
          messageUUID: 'fake-uuid'
        }
      });
    });

    it('should return an error if message sending fails - let caller deal with it', async () => {
      const error = new Error('Booom!');
      const sendMessageSpy = vi.fn().mockRejectedValue(error);
      const safePublishSpy = vi.fn();
      const deductCreditsFn = vi.fn().mockResolvedValue(validCreditDeductionSuccess);

      const result = testIt(validEvent, sendMessageSpy, safePublishSpy, deductCreditsFn, true);

      await expect(result).rejects.toThrow(error);
      expect(sendMessageSpy).toHaveBeenCalledOnce();
      expect(safePublishSpy).not.toHaveBeenCalled();
    });

    it('should return an error if user has insufficient credits - let caller deal with it', async () => {
      const creditOperationResult: CreditDeductionInsufficientCreditsError = {
        operationId: 'InsufficientCredits',
        success: false,
        error: new InsufficientCreditsError(
          'some message that coulnot be sent',
          {},
          new Error('No money mate')
        )
      };
      const sendMessageSpy = vi.fn();
      const safePublishSpy = vi.fn();
      const deductCreditsFn = vi.fn().mockResolvedValue(creditOperationResult);

      const result = testIt(validEvent, sendMessageSpy, safePublishSpy, deductCreditsFn, true);

      await expect(result).rejects.toThrow(
        'A message could not be sent due to insufficient credits'
      );
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validEvent,
        eventType: 'ActionableEventReminderInsufficientCreditNotSent',
        data: {
          originalEvent: {
            ...validEvent.data
          },
          error: creditOperationResult
        }
      });
    });

    it('should return an error if unknown error when deducting credits - let caller deal with it', async () => {
      const creditOperationResult: CreditDeductionUnexpectedError = {
        operationId: 'UnknownError',
        success: false,
        error: new Error('No money mate')
      };
      const sendMessageSpy = vi.fn();
      const safePublishSpy = vi.fn();
      const deductCreditsFn = vi.fn().mockResolvedValue(creditOperationResult);

      const result = testIt(validEvent, sendMessageSpy, safePublishSpy, deductCreditsFn, true);

      await expect(result).rejects.toThrow(
        'A message could not be sent due to an unknown issue while deducting the credits'
      );
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expect(safePublishSpy).not.toHaveBeenCalled();
    });

    function testIt(
      event: ActionableEventFoundEvent | DemoReminderToBeSentEvent,
      sendMessageFn: () => Promise<Uuid>,
      safePublishFn: () => Promise<void>,
      deductCreditsFn: () => Promise<CreditDeductionResult>,
      messagingEnabled: boolean,
      config: VonageEndpointConfig & CreditServiceEndpointConfig = defaultConfig
    ): Promise<Uuid> {
      vi.mocked(MessagingService).mockReturnValue({
        sendMessage: sendMessageFn
      } as unknown as MessagingService);

      const snsServiceMock = {
        safePublish: safePublishFn
      };
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(SnsService.withConfig).mockReturnValue(snsServiceMock as unknown as SnsService);
      const snsService = SnsService.withConfig({} as SnsTopicConfig, logger);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(CreditsService.prototype.deductCredits).mockImplementation(deductCreditsFn);
      const creditService = new CreditsService(
        {} as unknown as UserBaseStore<'google.com'>,
        logger
      );
      const messageProcessor = new Processor(
        config,
        messagingEnabled,
        snsService,
        creditService,
        logger
      );
      return messageProcessor.process(event);
    }
  });
});
