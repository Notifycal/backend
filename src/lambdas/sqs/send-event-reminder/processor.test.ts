import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
import type { PublishCommandOutput } from '@aws-sdk/client-sns';
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import type {
  CreditServiceEndpointConfig,
  DemoReminderEndpointConfig,
  MessagingAlertingEndpointConfig,
  MessagingEndpointConfig,
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
import type { Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { CreditsService } from '@services/credits-service';
import { MessagingService } from '@services/messaging';
import { SnsService } from '@services/sns';
import type { UserBaseStore } from '@services/stores/user-base-store';
import type { VonageApplicationId, VonagePrivateKey } from '@services/vonage';
import {
  validActionableEventEvent,
  validDemoReminderToBeSentEvent
} from '@testing/data/app-events';
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
  MessagingEndpointConfig &
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
  },
  messagingConfig: {
    enabled: true
  }
};

const validActionableEvent: ActionableEventFoundEvent = validActionableEventEvent;
const validDemoEvent: DemoReminderToBeSentEvent = validDemoReminderToBeSentEvent;
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
const validDemoCounterSuccess: DemoCounterIncrementResult = {
  success: true,
  result: 'Success',
  demoRemindersCount: 2
};
const safePublishSuccess: PublishCommandOutput = { $metadata: {} };

describe('Messaging processor', () => {
  const validReturnedUuid = 'test-uuid-123' as Uuid;

  describe('process', () => {
    it('should process actionable event successfully', async () => {
      const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);
      const safePublishSpy = vi.fn().mockResolvedValue(safePublishSuccess);
      const deductCreditsFn = vi.fn().mockResolvedValue(validCreditDeductionSuccess);
      const loggerAppendKeysSpy = vi.spyOn(logger, 'appendKeys');

      const result = await testWithActionableEvent(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn
      );

      expect(result).toStrictEqual(validReturnedUuid);
      expect(loggerAppendKeysSpy).toHaveBeenCalledWith({
        reminderMessage: validActionableEvent.data.message,
        senderDetails: validActionableEvent.data.senderDetails,
        receiverDetails: validActionableEvent.data.receiverDetails
      });
      expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    });

    it('should deduct credits when a message is sent', async () => {
      const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);
      const safePublishSpy = vi.fn().mockResolvedValue(safePublishSuccess);
      const deductCreditsFn = vi.fn().mockResolvedValue(validCreditDeductionSuccess);

      const result = await testWithActionableEvent(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn
      );

      expect(result).toStrictEqual(validReturnedUuid);
      expect(deductCreditsFn).toHaveBeenCalledWith(
        validActionableEvent.userId,
        1 * defaultConfig.countryToSMSCostCreditsMap.ES // 1 SMS * 7 credits per SMS in ES
      );
    });

    it('should return an error if message sending fails and restore credits successfully', async () => {
      const sendError = new Error('Message sending failed');
      const sendMessageSpy = vi.fn().mockRejectedValue(sendError);
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

      const safePublishSpy = vi.fn().mockResolvedValue(safePublishSuccess);

      const result = testItWithRestore(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn,
        restoreCreditsFn
      );

      await expect(result).rejects.toThrow(sendError);
      expect(sendMessageSpy).toHaveBeenCalledOnce();
      expect(restoreCreditsFn).toHaveBeenCalledWith(validActionableEvent.userId, 7, 'subscription');
      expect(loggerInfoSpy).toHaveBeenCalledWith('Credits restored after message send failure', {
        userId: validActionableEvent.userId,
        restoredCredits: 7,
        balanceType: 'subscription'
      });
    });

    it('should return an error if message sending fails and credit restoration fails', async () => {
      const sendError = new Error('Message sending failed');
      const restoreError = new Error('Restore failed');
      const sendMessageSpy = vi.fn().mockRejectedValue(sendError);
      const deductCreditsFn = vi.fn().mockResolvedValue(validCreditDeductionSuccess);
      const restoreCreditsFn = vi.fn().mockRejectedValue(restoreError);
      const loggerErrorSpy = vi.spyOn(logger, 'error');

      const safePublishSpyRestore = vi.fn().mockResolvedValue(safePublishSuccess);

      const result = testItWithRestore(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpyRestore,
        deductCreditsFn,
        restoreCreditsFn
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
      expect(safePublishSpyRestore).not.toHaveBeenCalled();
    });

    it('should return an error if demo reminder sending fails and decrement counter successfully', async () => {
      const sendError = new Error('Demo message sending failed');
      const sendMessageSpy = vi.fn().mockRejectedValue(sendError);
      const incrementDemoCounterFn = vi.fn().mockResolvedValue(validDemoCounterSuccess);
      const decrementDemoCounterFn = vi.fn().mockResolvedValue({
        success: true as const,
        result: 'Success' as const,
        demoRemindersCount: 1
      });
      const loggerInfoSpy = vi.spyOn(logger, 'info');
      const safePublishSpyDecrement = vi.fn().mockResolvedValue(safePublishSuccess);

      const result = testWithDemoReminderEventAndDecrement(
        validDemoEvent,
        sendMessageSpy,
        safePublishSpyDecrement,
        incrementDemoCounterFn,
        decrementDemoCounterFn
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
      expect(safePublishSpyDecrement).not.toHaveBeenCalled();
    });

    it('should return an error if demo reminder sending fails and counter decrement fails', async () => {
      const sendError = new Error('Demo message sending failed');
      const decrementError = new Error('Decrement failed');
      const sendMessageSpy = vi.fn().mockRejectedValue(sendError);
      const incrementDemoCounterFn = vi.fn().mockResolvedValue(validDemoCounterSuccess);
      const decrementDemoCounterFn = vi.fn().mockRejectedValue(decrementError);
      const loggerErrorSpy = vi.spyOn(logger, 'error');
      const safePublishSpyDemoError = vi.fn().mockResolvedValue(safePublishSuccess);

      const result = testWithDemoReminderEventAndDecrement(
        validDemoEvent,
        sendMessageSpy,
        safePublishSpyDemoError,
        incrementDemoCounterFn,
        decrementDemoCounterFn
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
      expect(safePublishSpyDemoError).not.toHaveBeenCalled();
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
      const safePublishSpy = vi.fn().mockResolvedValue(safePublishSuccess);
      const deductCreditsFn = vi.fn().mockResolvedValue(creditOperationResult);

      const result = await testWithActionableEvent(
        validActionableEvent,
        sendMessageSpy,
        safePublishSpy,
        deductCreditsFn
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
        deductCreditsFn
      );

      await expect(result).rejects.toThrow(
        'A message could not be sent due to an unknown issue during credit deduction'
      );
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expect(safePublishSpy).not.toHaveBeenCalled();
    });

    it('should process demo reminder event successfully', async () => {
      const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);
      const incrementDemoCounterFn = vi.fn().mockResolvedValue(validDemoCounterSuccess);
      const demoReminderlimit = 1;
      const safePublishSpy = vi.fn().mockResolvedValue(safePublishSuccess);

      const result = await testWithDemoReminderEvent(
        validDemoEvent,
        sendMessageSpy,
        safePublishSpy,
        incrementDemoCounterFn
      );

      expect(result).toStrictEqual(validReturnedUuid);
      expect(incrementDemoCounterFn).toHaveBeenCalledWith(validDemoEvent.userId, demoReminderlimit);
      expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    });

    it('should return specific UUID when demo limit is reached', async () => {
      const demoLimitError: DemoCounterLimitReachedError = {
        result: 'DemoCounterLimitReachedError',
        success: false,
        error: new Error('Demo limit reached')
      };
      const sendMessageSpy = vi.fn();
      const incrementDemoCounterFn = vi.fn().mockResolvedValue(demoLimitError);
      const safePublishSpy = vi.fn().mockResolvedValue(safePublishSuccess);

      const result = await testWithDemoReminderEvent(
        validDemoEvent,
        sendMessageSpy,
        safePublishSpy,
        incrementDemoCounterFn
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
        const sendMessageSpy = vi.fn().mockResolvedValue(validReturnedUuid);
        const safePublishSpy = vi.fn().mockResolvedValue(safePublishSuccess);
        const deductCreditsFn = vi.fn().mockResolvedValue(creditResult);

        await testWithActionableEvent(
          validActionableEvent,
          sendMessageSpy,
          safePublishSpy,
          deductCreditsFn,
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
      config: VonageEndpointConfig &
        CreditServiceEndpointConfig &
        DemoReminderEndpointConfig &
        MessagingEndpointConfig &
        MessagingAlertingEndpointConfig = defaultConfig
    ): Promise<Uuid> {
      return createProcessorAndTest(event, sendMessageFn, safePublishFn, config, {
        deductCreditsFn
      });
    }

    function testItWithRestore(
      event: ActionableEventFoundEvent,
      sendMessageFn: () => Promise<Uuid>,
      safePublishFn: () => Promise<void>,
      deductCreditsFn: () => Promise<CreditDeductionResult<'deduct'>>,
      restoreCreditsFn: () => Promise<CreditAdditionResult<'restore'>>,
      config: VonageEndpointConfig &
        CreditServiceEndpointConfig &
        DemoReminderEndpointConfig &
        MessagingEndpointConfig &
        MessagingAlertingEndpointConfig = defaultConfig
    ): Promise<Uuid> {
      return createProcessorAndTest(event, sendMessageFn, safePublishFn, config, {
        deductCreditsFn,
        restoreCreditsFn
      });
    }

    function testWithDemoReminderEvent(
      event: DemoReminderToBeSentEvent,
      sendMessageFn: () => Promise<Uuid>,
      safePublishFn: () => Promise<void>,
      incrementDemoCounterFn: () => Promise<DemoCounterIncrementResult>,
      config: VonageEndpointConfig &
        CreditServiceEndpointConfig &
        DemoReminderEndpointConfig &
        MessagingEndpointConfig &
        MessagingAlertingEndpointConfig = defaultConfig
    ): Promise<Uuid> {
      return createProcessorAndTest(event, sendMessageFn, safePublishFn, config, {
        incrementDemoCounterFn
      });
    }

    function testWithDemoReminderEventAndDecrement(
      event: DemoReminderToBeSentEvent,
      sendMessageFn: () => Promise<Uuid>,
      safePublishFn: () => Promise<void>,
      incrementDemoCounterFn: () => Promise<DemoCounterIncrementResult>,
      decrementDemoCounterFn: () => Promise<DemoCounterDecrementResult>,
      config: VonageEndpointConfig &
        CreditServiceEndpointConfig &
        DemoReminderEndpointConfig &
        MessagingEndpointConfig &
        MessagingAlertingEndpointConfig = defaultConfig
    ): Promise<Uuid> {
      return createProcessorAndTest(event, sendMessageFn, safePublishFn, config, {
        incrementDemoCounterFn,
        decrementDemoCounterFn
      });
    }

    function createProcessorAndTest(
      event: ActionableEventFoundEvent | DemoReminderToBeSentEvent,
      sendMessageFn: () => Promise<Uuid>,
      safePublishFn: () => Promise<void>,
      config: VonageEndpointConfig &
        CreditServiceEndpointConfig &
        DemoReminderEndpointConfig &
        MessagingEndpointConfig &
        MessagingAlertingEndpointConfig,
      creditServiceFns: {
        deductCreditsFn?: () => Promise<CreditDeductionResult<'deduct'>>;
        restoreCreditsFn?: () => Promise<CreditAdditionResult<'restore'>>;
        incrementDemoCounterFn?: () => Promise<DemoCounterIncrementResult>;
        decrementDemoCounterFn?: () => Promise<DemoCounterDecrementResult>;
      }
    ): Promise<Uuid> {
      vi.mocked(MessagingService).mockImplementation(
        () =>
          ({
            sendMessage: sendMessageFn
          }) as unknown as MessagingService
      );

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
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(CreditsService.prototype.deductCredits).mockImplementation(
        creditServiceFns.deductCreditsFn || vi.fn()
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(CreditsService.prototype.restoreCredits).mockImplementation(
        creditServiceFns.restoreCreditsFn || vi.fn()
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(CreditsService.prototype.incrementDemoReminderCount).mockImplementation(
        creditServiceFns.incrementDemoCounterFn || vi.fn()
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(CreditsService.prototype.decrementDemoReminderCount).mockImplementation(
        creditServiceFns.decrementDemoCounterFn || vi.fn()
      );

      const messageProcessor = new Processor(config, snsService, creditService, logger);
      return messageProcessor.process(event);
    }
  });
});
