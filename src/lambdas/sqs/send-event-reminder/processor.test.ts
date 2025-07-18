import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import type {
  CreditServiceEndpointConfig,
  DemoReminderEndpointConfig,
  MessagingAlertingEndpointConfig,
  SnsTopicConfig
} from '@model/Config';
import type {
  CreditAdditionResult,
  CreditDeductionInsufficientCreditsError,
  CreditDeductionResult,
  CreditDeductionSuccess,
  CreditDeductionUnexpectedError,
  DemoCounterDecrementResult,
  DemoCounterIncrementResult,
  DemoCounterLimitReachedError
} from '@model/Credits';
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
import { CreditsService } from '@services/credits-service';
import {
  VonageMessagingService,
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

const defaultConfig: VonageEndpointConfig &
  CreditServiceEndpointConfig &
  DemoReminderEndpointConfig &
  MessagingAlertingEndpointConfig = {
  vonageConfig: {
    applicationId: 'some app id' as VonageApplicationId,
    webhookBaseURL: 'https://test.com' as Url,
    privateKeySSMPath: 'some path',
    privateKey: 'some private key' as VonagePrivateKey
  },
  countryToSMSCostCreditsMap: {
    ES: 7
  },
  demoReminderConfig: {
    demoReminderLimit: 1
  },
  messagingAlertingConfig: {
    lowCreditThreshold: 100
  }
};

const validActionableEvent: ActionableEventFoundEvent = {
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

const validCreditDeductionSuccess: CreditDeductionSuccess<'deduct'> = {
  success: true,
  result: 'Success',
  operationDetails: {
    fromBalance: 'subscription',
    type: 'deduct',
    quantity: 7
  },
  balances: {
    subscription: 400,
    topup: 5
  }
};

const validDemoEvent: DemoReminderToBeSentEvent = {
  data: {
    receiverDetails: {
      type: 'phone',
      phoneNumber: '+34123456789' as PhoneNumberE164,
      countryCode: 'ES'
    },
    senderDetails: {
      type: 'phone',
      phoneNumber: '+34666999888' as PhoneNumberE164,
      countryCode: 'ES'
    },
    message: `This is a demo message`
  },
  correlationId: '0de651ef-535e-4d2e-b9ff-7bf43f5aaaaa' as CorrelationId,
  eventId: '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac' as EventId,
  userId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0000' as UserId,
  idp: 'google.com',
  idpId: '45346356356' as IdpId,
  eventType: 'DemoReminderToBeSent',
  happenedAt: '2024-01-02T15:04:50Z' as DateTime
};

const validDemoCounterSuccess: DemoCounterIncrementResult = {
  success: true,
  result: 'Success',
  demoRemindersCount: 2
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

      const result = await testWithActionableEvent(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn,
        messagingEnabled
      );

      expect(result).toStrictEqual(validReturnedUuid);
      expect(sendMessageSpy).toHaveBeenCalledWith(
        validActionableEvent.data.message,
        validActionableEvent.data.senderDetails,
        validActionableEvent.data.receiverDetails,
        validActionableEvent.correlationId,
        expect.stringContaining(defaultConfig.vonageConfig.webhookBaseURL)
      );
      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validActionableEvent,
        eventType: 'ActionableEventReminderAttemptSent',
        data: {
          ...validActionableEvent.data,
          messageUUID: validReturnedUuid,
          creditDeductionResult: validCreditDeductionSuccess
        }
      });
      expect(loggerAppendKeysSpy).toHaveBeenCalledWith({
        reminderMessage: validActionableEvent.data.message,
        senderDetails: validActionableEvent.data.senderDetails,
        receiverDetails: validActionableEvent.data.receiverDetails
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

      const result = await testWithActionableEvent(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn,
        messagingEnabled
      );

      expect(result).toStrictEqual(validReturnedUuid);
      expect(deductCreditsFn).toHaveBeenCalledWith(
        validActionableEvent.userId,
        1 * defaultConfig.countryToSMSCostCreditsMap.ES // 1 SMS * 7 credits per SMS in ES
      );
    });

    it('should return a fake uuid when messaging is disabled', async () => {
      const messagingEnabled = false;
      const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);
      const safePublishSpy = vi.fn().mockResolvedValue({});
      const deductCreditsFn = vi.fn().mockResolvedValue(validCreditDeductionSuccess);

      const result = await testWithActionableEvent(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn,
        messagingEnabled
      );

      expect(result).toBe('fake-uuid');
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validActionableEvent,
        eventType: 'ActionableEventReminderAttemptSent',
        data: {
          ...validActionableEvent.data,
          messageUUID: 'fake-uuid',
          creditDeductionResult: validCreditDeductionSuccess
        }
      });
    });

    it('should return an error if message sending fails and restore credits successfully', async () => {
      const sendError = new Error('Message sending failed');
      const sendMessageSpy = vi.fn().mockRejectedValue(sendError);
      const safePublishSpy = vi.fn();
      const deductCreditsFn = vi.fn().mockResolvedValue(validCreditDeductionSuccess);
      const restoreCreditsFn = vi.fn().mockResolvedValue({
        success: true,
        result: 'Success',
        operationDetails: {
          fromBalance: 'subscription',
          type: 'restore',
          quantity: 7
        },
        balances: {
          subscription: 407,
          topup: 5
        }
      });

      const loggerInfoSpy = vi.spyOn(logger, 'info');

      const result = testItWithRestore(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn,
        restoreCreditsFn,
        true
      );

      await expect(result).rejects.toThrow(sendError);
      expect(sendMessageSpy).toHaveBeenCalledOnce();
      expect(restoreCreditsFn).toHaveBeenCalledWith(validActionableEvent.userId, 7, 'subscription');
      expect(loggerInfoSpy).toHaveBeenCalledWith('Credits restored after message send failure', {
        userId: validActionableEvent.userId,
        restoredCredits: 7,
        balanceType: 'subscription'
      });
      expect(safePublishSpy).not.toHaveBeenCalled();
    });

    it('should return an error if message sending fails and credit restoration fails', async () => {
      const sendError = new Error('Message sending failed');
      const restoreError = new Error('Restore failed');
      const sendMessageSpy = vi.fn().mockRejectedValue(sendError);
      const safePublishSpy = vi.fn();
      const deductCreditsFn = vi.fn().mockResolvedValue(validCreditDeductionSuccess);
      const restoreCreditsFn = vi.fn().mockRejectedValue(restoreError);

      const loggerErrorSpy = vi.spyOn(logger, 'error');

      const result = testItWithRestore(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn,
        restoreCreditsFn,
        true
      );

      await expect(result).rejects.toThrow(sendError);
      expect(sendMessageSpy).toHaveBeenCalledOnce();
      expect(restoreCreditsFn).toHaveBeenCalledWith(validActionableEvent.userId, 7, 'subscription');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to restore credits after message send failure',
        {
          userId: validActionableEvent.userId,
          creditsToRestore: 7,
          balanceType: 'subscription',
          restoreError
        }
      );
      expect(safePublishSpy).not.toHaveBeenCalled();
    });

    it('should return an error if demo reminder sending fails and decrement counter successfully', async () => {
      const sendError = new Error('Demo message sending failed');
      const sendMessageSpy = vi.fn().mockRejectedValue(sendError);
      const safePublishSpy = vi.fn();
      const incrementDemoCounterFn = vi.fn().mockResolvedValue(validDemoCounterSuccess);
      const decrementDemoCounterFn = vi.fn().mockResolvedValue({
        success: true as const,
        result: 'Success' as const,
        demoRemindersCount: 1
      });

      const loggerInfoSpy = vi.spyOn(logger, 'info');

      const result = testWithDemoReminderEventAndDecrement(
        validDemoEvent,
        sendMessageSpy,
        safePublishSpy,
        incrementDemoCounterFn,
        decrementDemoCounterFn,
        true
      );

      await expect(result).rejects.toThrow(sendError);
      expect(sendMessageSpy).toHaveBeenCalledOnce();
      expect(decrementDemoCounterFn).toHaveBeenCalledWith(validDemoEvent.userId);
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        'Demo counter decremented after message send failure',
        {
          userId: validDemoEvent.userId
        }
      );
      expect(safePublishSpy).not.toHaveBeenCalled();
    });

    it('should return an error if demo reminder sending fails and counter decrement fails', async () => {
      const sendError = new Error('Demo message sending failed');
      const decrementError = new Error('Decrement failed');
      const sendMessageSpy = vi.fn().mockRejectedValue(sendError);
      const safePublishSpy = vi.fn();
      const incrementDemoCounterFn = vi.fn().mockResolvedValue(validDemoCounterSuccess);
      const decrementDemoCounterFn = vi.fn().mockRejectedValue(decrementError);

      const loggerErrorSpy = vi.spyOn(logger, 'error');

      const result = testWithDemoReminderEventAndDecrement(
        validDemoEvent,
        sendMessageSpy,
        safePublishSpy,
        incrementDemoCounterFn,
        decrementDemoCounterFn,
        true
      );

      await expect(result).rejects.toThrow(sendError);
      expect(sendMessageSpy).toHaveBeenCalledOnce();
      expect(decrementDemoCounterFn).toHaveBeenCalledWith(validDemoEvent.userId);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to decrement demo counter after message send failure',
        {
          userId: validDemoEvent.userId,
          decrementError
        }
      );
      expect(safePublishSpy).not.toHaveBeenCalled();
    });

    it('should return specific UUID if user has insufficient credits and publish error event', async () => {
      const creditOperationResult: CreditDeductionInsufficientCreditsError = {
        result: 'InsufficientCredits',
        success: false,
        error: new InsufficientCreditsError(
          'some message that coulnot be sent',
          {},
          new Error('No money mate')
        )
      };
      const sendMessageSpy = vi.fn();
      const safePublishSpy = vi.fn().mockResolvedValue({});
      const deductCreditsFn = vi.fn().mockResolvedValue(creditOperationResult);

      const result = await testWithActionableEvent(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn,
        true
      );

      expect(result).toBe('insufficient-credits');
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validActionableEvent,
        eventType: 'InsufficientCreditsReminderNotSent',
        data: {
          originalEvent: {
            ...validActionableEvent.data
          },
          error: creditOperationResult
        }
      });
    });

    it('should return an error if unknown error when deducting credits - let caller deal with it', async () => {
      const creditOperationResult: CreditDeductionUnexpectedError = {
        result: 'UnknownError',
        success: false,
        error: new Error('No money mate')
      };
      const sendMessageSpy = vi.fn();
      const safePublishSpy = vi.fn();
      const deductCreditsFn = vi.fn().mockResolvedValue(creditOperationResult);

      const result = testWithActionableEvent(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn,
        true
      );

      await expect(result).rejects.toThrow(
        'A message could not be sent due to an unknown issue during credit deduction'
      );
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expect(safePublishSpy).not.toHaveBeenCalled();
    });

    it('should send demo reminder message when messaging is enabled', async () => {
      const safePublishSpy = vi.fn().mockResolvedValue({ $metadata: {} });
      const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);
      const messagingEnabled = true;
      const incrementDemoCounterFn = vi.fn().mockResolvedValue(validDemoCounterSuccess);
      const demoReminderlimit = 1;

      const result = await testWithDemoReminderEvent(
        validDemoEvent,
        sendMessageSpy,
        safePublishSpy,
        incrementDemoCounterFn,
        messagingEnabled
      );

      expect(result).toStrictEqual(validReturnedUuid);
      expect(incrementDemoCounterFn).toHaveBeenCalledWith(validDemoEvent.userId, demoReminderlimit);
      expect(sendMessageSpy).toHaveBeenCalledWith(
        validDemoEvent.data.message,
        validDemoEvent.data.senderDetails,
        validDemoEvent.data.receiverDetails,
        validDemoEvent.correlationId,
        expect.any(String)
      );
    });

    it('should return specific UUID when demo limit is reached', async () => {
      const demoLimitError: DemoCounterLimitReachedError = {
        result: 'DemoCounterLimitReachedError',
        success: false,
        error: new Error('Demo limit reached')
      };
      const sendMessageSpy = vi.fn();
      const safePublishSpy = vi.fn().mockResolvedValue({});
      const incrementDemoCounterFn = vi.fn().mockResolvedValue(demoLimitError);

      const result = await testWithDemoReminderEvent(
        validDemoEvent,
        sendMessageSpy,
        safePublishSpy,
        incrementDemoCounterFn,
        true
      );

      expect(result).toBe('demo-limit-reached');
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expect(safePublishSpy).toHaveBeenCalledWith({
        ...validDemoEvent,
        eventType: 'DemoReminderLimitReachedNotSent',
        data: {
          originalEvent: {
            ...validDemoEvent.data
          },
          error: demoLimitError
        }
      });
    });

    describe('lowCreditsDetected event', () => {
      const lowCreditsThreshold = 100;
      const validConfigWithLowThreshold = {
        ...defaultConfig,
        messagingAlertingConfig: { lowCreditThreshold: lowCreditsThreshold }
      };

      async function testLowCreditsScenario(
        creditResult: CreditDeductionResult<'deduct'>,
        expectSendLowCreditsDetectedEvent: boolean,
        config = validConfigWithLowThreshold
      ) {
        const safePublishSpy = vi.fn().mockResolvedValue({ $metadata: {} });
        const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);
        const deductCreditsFn = vi.fn().mockResolvedValue(creditResult);

        await testWithActionableEvent(
          validActionableEvent,
          sendMessageSpy,
          safePublishSpy,
          deductCreditsFn,
          true,
          config
        );

        if (expectSendLowCreditsDetectedEvent) {
          expect(safePublishSpy).toHaveBeenCalledWith({
            ...validActionableEvent,
            eventType: 'LowCreditsDetected',
            data: {
              originalEvent: validActionableEvent.data,
              lastCreditReductionResult: creditResult
            }
          });
        } else {
          expect(safePublishSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({ eventType: 'LowCreditsDetected' })
          );
        }

        return safePublishSpy;
      }

      // eslint-disable-next-line vitest/expect-expect
      it('should send lowCreditsDetected event when credits cross below threshold', async () => {
        const creditResult: CreditDeductionSuccess<'deduct'> = {
          success: true,
          result: 'Success',
          operationDetails: { fromBalance: 'subscription', type: 'deduct', quantity: 7 },
          balances: { subscription: 95, topup: 0 }
        };

        await testLowCreditsScenario(creditResult, true);
      });

      // eslint-disable-next-line vitest/expect-expect
      it('should NOT send lowCreditsDetected event when credits remain above threshold', async () => {
        const creditResult: CreditDeductionSuccess<'deduct'> = {
          success: true,
          result: 'Success',
          operationDetails: { fromBalance: 'subscription', type: 'deduct', quantity: 7 },
          balances: { subscription: 200, topup: 50 }
        };

        await testLowCreditsScenario(creditResult, false);
      });

      // eslint-disable-next-line vitest/expect-expect
      it('should NOT send lowCreditsDetected event when credits remain below threshold', async () => {
        const creditResult: CreditDeductionSuccess<'deduct'> = {
          success: true,
          result: 'Success',
          operationDetails: { fromBalance: 'subscription', type: 'deduct', quantity: 7 },
          balances: { subscription: 50, topup: 20 }
        };

        await testLowCreditsScenario(creditResult, false);
      });

      // eslint-disable-next-line vitest/expect-expect
      it('should send lowCreditsDetected event when combined subscription and topup credits cross threshold', async () => {
        const validHigherThresholdConfig = {
          ...defaultConfig,
          messagingAlertingConfig: { lowCreditThreshold: 150 }
        };
        const validCreditResult: CreditDeductionSuccess<'deduct'> = {
          success: true,
          result: 'Success',
          operationDetails: { fromBalance: 'topup', type: 'deduct', quantity: 7 },
          balances: { subscription: 100, topup: 44 }
        };

        await testLowCreditsScenario(validCreditResult, true, validHigherThresholdConfig);
      });

      it('should NOT send lowCreditsDetected event when credit deduction fails', async () => {
        const invalidCreditResult: CreditDeductionInsufficientCreditsError = {
          result: 'InsufficientCredits',
          success: false,
          error: new InsufficientCreditsError(
            'some message that could not be sent',
            {},
            new Error('No credits')
          )
        };

        const safePublishSpy = await testLowCreditsScenario(invalidCreditResult, false);

        expect(safePublishSpy).toHaveBeenCalledWith({
          ...validActionableEvent,
          eventType: 'InsufficientCreditsReminderNotSent',
          data: {
            originalEvent: validActionableEvent.data,
            error: invalidCreditResult
          }
        });
      });

      // eslint-disable-next-line vitest/expect-expect
      it('should handle edge case when credits exactly equal threshold after deduction', async () => {
        const validCreditResultAtThreshold: CreditDeductionSuccess<'deduct'> = {
          success: true,
          result: 'Success',
          operationDetails: { fromBalance: 'subscription', type: 'deduct', quantity: 7 },
          balances: { subscription: 100, topup: 0 }
        };

        await testLowCreditsScenario(validCreditResultAtThreshold, false);
      });
    });

    function testWithActionableEvent(
      event: ActionableEventFoundEvent,
      sendMessageFn: () => Promise<Uuid>,
      safePublishFn: () => Promise<void>,
      deductCreditsFn: () => Promise<CreditDeductionResult<'deduct'>>,
      messagingEnabled: boolean,
      config: VonageEndpointConfig &
        CreditServiceEndpointConfig &
        DemoReminderEndpointConfig &
        MessagingAlertingEndpointConfig = defaultConfig
    ): Promise<Uuid> {
      return createProcessorAndTest(
        event,
        sendMessageFn,
        safePublishFn,
        messagingEnabled,
        config,
        () => {
          // eslint-disable-next-line @typescript-eslint/unbound-method
          vi.mocked(CreditsService.prototype.deductCredits).mockImplementation(deductCreditsFn);
        }
      );
    }

    function testItWithRestore(
      event: ActionableEventFoundEvent,
      sendMessageFn: () => Promise<Uuid>,
      safePublishFn: () => Promise<void>,
      deductCreditsFn: () => Promise<CreditDeductionResult<'deduct'>>,
      restoreCreditsFn: () => Promise<CreditAdditionResult<'restore'>>,
      messagingEnabled: boolean,
      config: VonageEndpointConfig &
        CreditServiceEndpointConfig &
        DemoReminderEndpointConfig &
        MessagingAlertingEndpointConfig = defaultConfig
    ): Promise<Uuid> {
      return createProcessorAndTest(
        event,
        sendMessageFn,
        safePublishFn,
        messagingEnabled,
        config,
        () => {
          // eslint-disable-next-line @typescript-eslint/unbound-method
          vi.mocked(CreditsService.prototype.deductCredits).mockImplementation(deductCreditsFn);
          // eslint-disable-next-line @typescript-eslint/unbound-method
          vi.mocked(CreditsService.prototype.restoreCredits).mockImplementation(restoreCreditsFn);
        }
      );
    }

    function testWithDemoReminderEvent(
      event: DemoReminderToBeSentEvent,
      sendMessageFn: () => Promise<Uuid>,
      safePublishFn: () => Promise<void>,
      incrementDemoCounterFn: () => Promise<DemoCounterIncrementResult>,
      messagingEnabled: boolean,
      config: VonageEndpointConfig &
        CreditServiceEndpointConfig &
        DemoReminderEndpointConfig &
        MessagingAlertingEndpointConfig = defaultConfig
    ): Promise<Uuid> {
      return createProcessorAndTest(
        event,
        sendMessageFn,
        safePublishFn,
        messagingEnabled,
        config,
        () => {
          // eslint-disable-next-line @typescript-eslint/unbound-method
          vi.mocked(CreditsService.prototype.incrementDemoReminderCount).mockImplementation(
            incrementDemoCounterFn
          );
        }
      );
    }

    function testWithDemoReminderEventAndDecrement(
      event: DemoReminderToBeSentEvent,
      sendMessageFn: () => Promise<Uuid>,
      safePublishFn: () => Promise<void>,
      incrementDemoCounterFn: () => Promise<DemoCounterIncrementResult>,
      decrementDemoCounterFn: () => Promise<DemoCounterDecrementResult>,
      messagingEnabled: boolean,
      config: VonageEndpointConfig &
        CreditServiceEndpointConfig &
        DemoReminderEndpointConfig &
        MessagingAlertingEndpointConfig = defaultConfig
    ): Promise<Uuid> {
      return createProcessorAndTest(
        event,
        sendMessageFn,
        safePublishFn,
        messagingEnabled,
        config,
        () => {
          // eslint-disable-next-line @typescript-eslint/unbound-method
          vi.mocked(CreditsService.prototype.incrementDemoReminderCount).mockImplementation(
            incrementDemoCounterFn
          );
          // eslint-disable-next-line @typescript-eslint/unbound-method
          vi.mocked(CreditsService.prototype.decrementDemoReminderCount).mockImplementation(
            decrementDemoCounterFn
          );
        }
      );
    }

    function createProcessorAndTest(
      event: ActionableEventFoundEvent | DemoReminderToBeSentEvent,
      sendMessageFn: () => Promise<Uuid>,
      safePublishFn: () => Promise<void>,
      messagingEnabled: boolean,
      config: VonageEndpointConfig &
        CreditServiceEndpointConfig &
        DemoReminderEndpointConfig &
        MessagingAlertingEndpointConfig,
      setupCreditService: (creditService: CreditsService<'google.com'>) => void
    ): Promise<Uuid> {
      vi.mocked(VonageMessagingService).mockReturnValue({
        sendMessage: sendMessageFn
      } as unknown as VonageMessagingService);

      const snsServiceMock = {
        safePublish: safePublishFn
      };
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(SnsService.withConfig).mockReturnValue(snsServiceMock as unknown as SnsService);
      const snsService = SnsService.withConfig({} as SnsTopicConfig, logger);

      const creditService = new CreditsService(
        {} as unknown as UserBaseStore<'google.com'>,
        logger
      );
      // Setup default mock for restoreCredits
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(CreditsService.prototype.restoreCredits).mockResolvedValue({
        success: true,
        result: 'Success',
        operationDetails: {
          fromBalance: 'subscription',
          type: 'restore',
          quantity: 1
        },
        balances: {
          subscription: 100,
          topup: 0
        }
      });

      // Setup default mock for decrementDemoReminderCount
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(CreditsService.prototype.decrementDemoReminderCount).mockResolvedValue({
        success: true as const,
        result: 'Success' as const,
        demoRemindersCount: 0
      });

      setupCreditService(creditService);

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
