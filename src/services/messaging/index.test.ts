import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
import type { PublishCommandOutput } from '@aws-sdk/client-sns';
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import type { MessagingEndpointConfig } from '@model/Config';
import type { CreditDeductionSuccess } from '@model/Credits';
import type { VonageEndpointConfig } from '@model/vendor/vonage/config';
import type { Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import {
  VonageMessagingService,
  type VonageApplicationId,
  type VonagePrivateKey
} from '@services/messaging/vonage';
import { SnsService } from '@services/sns';
import {
  validActionableEventEvent,
  validDemoReminderToBeSentEvent
} from '@testing/data/app-events';
import { describe, expect, it, vi } from 'vitest';
import { MessagingService } from './index';
import type { EventWithSuccessfulDeduction } from './model';

vi.mock('@services/sns');
vi.mock('@services/messaging/vonage');
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

const validConfig: VonageEndpointConfig & MessagingEndpointConfig = {
  vonageConfig: {
    applicationId: 'some-app-id' as VonageApplicationId,
    webhookBaseURL: 'https://test.com' as Url,
    privateKeySSMPath: 'some-path',
    privateKey: 'some-private-key' as VonagePrivateKey
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

const createActionableEventWithSuccessfulDeduction = (
  event: ActionableEventFoundEvent
): EventWithSuccessfulDeduction => ({
  event,
  deductionResult: validCreditDeductionSuccess,
  numberOfMessagesEstimate: {
    encoding: 'GSM_7BIT' as const,
    length: 20,
    characterPerMessage: 160,
    inCurrentMessage: 20,
    remaining: 140,
    messages: 1
  }
});

const createDemoEventWithSuccessfulDeduction = (
  event: DemoReminderToBeSentEvent
): EventWithSuccessfulDeduction => ({
  event,
  deductionResult: {
    success: true,
    result: 'Success',
    demoRemindersCount: 1
  },
  numberOfMessagesEstimate: {
    encoding: 'GSM_7BIT' as const,
    length: 20,
    characterPerMessage: 160,
    inCurrentMessage: 20,
    remaining: 140,
    messages: 1
  }
});

describe(MessagingService, () => {
  const validReturnedUuid = 'test-uuid-123' as Uuid;
  const safePublishSuccess: PublishCommandOutput = { $metadata: {} };

  describe('sendMessage', () => {
    it('should send message through Vonage when enabled', async () => {
      const sendMessageFn = vi.fn().mockResolvedValue(validReturnedUuid);
      const safePublishFn = vi.fn().mockResolvedValue(safePublishSuccess);
      const loggerInfoSpy = vi.spyOn(logger, 'info');
      const eventWithDeduction = createActionableEventWithSuccessfulDeduction(validActionableEvent);

      const result = testIt(eventWithDeduction, safePublishFn, sendMessageFn, validConfig, logger);

      await expect(result).resolves.toBe(validReturnedUuid);
      expect(sendMessageFn).toHaveBeenCalledWith(
        validActionableEvent.data.message,
        validActionableEvent.data.senderDetails,
        validActionableEvent.data.receiverDetails,
        validActionableEvent.correlationId,
        `${validConfig.vonageConfig.webhookBaseURL}?originalEvent%5Bdata%5D%5BreceiverDetails%5D%5Btype%5D=phone&originalEvent%5Bdata%5D%5BreceiverDetails%5D%5BphoneNumber%5D=%2B34123456789&originalEvent%5Bdata%5D%5BreceiverDetails%5D%5BcountryCode%5D=ES&originalEvent%5Bdata%5D%5Brun%5D%5BlowerBoundStartTime%5D=2023-01-01T00%3A00%3A00Z&originalEvent%5Bdata%5D%5Brun%5D%5BupperBoundStartTime%5D=2023-01-01T00%3A29%3A59Z&originalEvent%5Bdata%5D%5Brun%5D%5BslidingWindowInMinutes%5D=30&originalEvent%5Bdata%5D%5Bcalendar%5D%5Bid%5D=some%20calendar%20id&originalEvent%5Bdata%5D%5Bcalendar%5D%5Bname%5D=some%20calendar%20name&originalEvent%5Bdata%5D%5BcalendarEvent%5D%5Bid%5D=event-1&originalEvent%5Bdata%5D%5BcalendarEvent%5D%5Battendees%5D%5B0%5D%5Bid%5D=attendee%40test.com&originalEvent%5Bdata%5D%5BsenderDetails%5D%5Btype%5D=phone&originalEvent%5Bdata%5D%5BsenderDetails%5D%5BphoneNumber%5D=%2B34666999888&originalEvent%5Bdata%5D%5BsenderDetails%5D%5BcountryCode%5D=ES&originalEvent%5BcorrelationId%5D=0de651ef-535e-4d2e-b9ff-7bf43f5aaaaa&originalEvent%5BuserId%5D=b150d276-e327-51fb-b455-34a87c1c8ecc&originalEvent%5Bidp%5D=google.com&originalEvent%5BidpId%5D=123456789&originalEvent%5BeventType%5D=ActionableEventFound&creditDeductionResult%5Bsuccess%5D=true&creditDeductionResult%5Bresult%5D=Success&creditDeductionResult%5BoperationDetails%5D%5BfromBalance%5D=subscription&creditDeductionResult%5BoperationDetails%5D%5Btype%5D=deduct&creditDeductionResult%5BoperationDetails%5D%5Bquantity%5D=7&creditDeductionResult%5Bbalances%5D%5Bsubscription%5D=400&creditDeductionResult%5Bbalances%5D%5Btopup%5D=5&estimatedMessageCount%5Bmessages%5D=1`
      );
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: validActionableEvent.userId,
          idp: validActionableEvent.idp,
          idpId: validActionableEvent.idpId,
          correlationId: validActionableEvent.correlationId,
          eventType: 'ActionableEventReminderAttemptSent',
          data: {
            ...validActionableEvent.data,
            messageUUID: validReturnedUuid,
            creditDeductionResult: validCreditDeductionSuccess
          }
        })
      );
      expect(loggerInfoSpy).toHaveBeenCalledWith('Sending a message through Vonage');
    });

    it('should simulate message sending when disabled', () => {
      const sendMessageFn = vi.fn().mockResolvedValue(validReturnedUuid);
      const safePublishFn = vi.fn().mockResolvedValue(safePublishSuccess);
      const loggerInfoSpy = vi.spyOn(logger, 'info');
      const eventWithDeduction = createActionableEventWithSuccessfulDeduction(validActionableEvent);
      const messaggingDisabledConfig = {
        ...validConfig,
        messagingConfig: {
          enabled: false
        }
      };

      const result = testIt(
        eventWithDeduction,
        safePublishFn,
        sendMessageFn,
        messaggingDisabledConfig,
        logger
      );

      return expect(result)
        .resolves.toBe('fake-uuid')
        .then(() => {
          expect(sendMessageFn).not.toHaveBeenCalled();
          expect(safePublishFn).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: validActionableEvent.userId,
              idp: validActionableEvent.idp,
              idpId: validActionableEvent.idpId,
              correlationId: validActionableEvent.correlationId,
              eventType: 'ActionableEventReminderAttemptSent',
              data: {
                ...validActionableEvent.data,
                messageUUID: 'fake-uuid',
                creditDeductionResult: validCreditDeductionSuccess
              }
            })
          );
          expect(loggerInfoSpy).toHaveBeenCalledWith('Simulating a message is being sent');
        });
    });

    it('should handle demo reminder events', () => {
      const sendMessageFn = vi.fn().mockResolvedValue(validReturnedUuid);
      const safePublishFn = vi.fn().mockResolvedValue(safePublishSuccess);
      const eventWithDeduction = createDemoEventWithSuccessfulDeduction(validDemoEvent);

      const result = testIt(eventWithDeduction, safePublishFn, sendMessageFn, validConfig, logger);

      return expect(result)
        .resolves.toBe(validReturnedUuid)
        .then(() => {
          expect(sendMessageFn).toHaveBeenCalledWith(
            validDemoEvent.data.message,
            validDemoEvent.data.senderDetails,
            validDemoEvent.data.receiverDetails,
            validDemoEvent.correlationId,
            `${validConfig.vonageConfig.webhookBaseURL}?originalEvent%5Bdata%5D%5BreceiverDetails%5D%5Btype%5D=phone&originalEvent%5Bdata%5D%5BreceiverDetails%5D%5BphoneNumber%5D=%2B34123456789&originalEvent%5Bdata%5D%5BreceiverDetails%5D%5BcountryCode%5D=ES&originalEvent%5Bdata%5D%5BsenderDetails%5D%5Btype%5D=phone&originalEvent%5Bdata%5D%5BsenderDetails%5D%5BphoneNumber%5D=%2B34666999888&originalEvent%5Bdata%5D%5BsenderDetails%5D%5BcountryCode%5D=ES&originalEvent%5BcorrelationId%5D=0de651ef-535e-4d2e-b9ff-7bf43f5aaaaa&originalEvent%5BuserId%5D=0de651ef-535e-4d2e-b9ff-7bf43f5a0000&originalEvent%5Bidp%5D=google.com&originalEvent%5BidpId%5D=45346356356&originalEvent%5BeventType%5D=DemoReminderToBeSent&creditDeductionResult%5Bsuccess%5D=true&creditDeductionResult%5Bresult%5D=Success&creditDeductionResult%5BdemoRemindersCount%5D=1&estimatedMessageCount%5Bmessages%5D=1`
          );
          expect(safePublishFn).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: validDemoEvent.userId,
              idp: validDemoEvent.idp,
              idpId: validDemoEvent.idpId,
              correlationId: validDemoEvent.correlationId,
              eventType: 'DemoReminderToBeSentAttemptSent',
              data: {
                ...validDemoEvent.data,
                messageUUID: validReturnedUuid,
                demoCounterIncrementResult: {
                  success: true,
                  result: 'Success',
                  demoRemindersCount: 1
                }
              }
            })
          );
        });
    });

    it('should build correct webhook URL with correlation data', () => {
      const sendMessageFn = vi.fn().mockResolvedValue(validReturnedUuid);
      const safePublishFn = vi.fn().mockResolvedValue(safePublishSuccess);
      const loggerInfoSpy = vi.spyOn(logger, 'info');
      const eventWithDeduction = createActionableEventWithSuccessfulDeduction(validActionableEvent);

      const result = testIt(eventWithDeduction, safePublishFn, sendMessageFn, validConfig, logger);

      return expect(result)
        .resolves.toBe(validReturnedUuid)
        .then(() => {
          const webhookUrl = sendMessageFn.mock.calls[0]?.[4] as string;

          expect(webhookUrl).toContain(validConfig.vonageConfig.webhookBaseURL);
          expect(webhookUrl).toContain('originalEvent');
          expect(webhookUrl).toContain('creditDeductionResult');
          // eslint-disable-next-line vitest/max-expects
          expect(webhookUrl).toContain('estimatedMessageCount');
          // eslint-disable-next-line vitest/max-expects
          expect(loggerInfoSpy).toHaveBeenCalledWith('FullWebhookUrl', { webhookUrl });
        });
    });

    it('should publish attempt sent event correctly', () => {
      const sendMessageFn = vi.fn().mockResolvedValue(validReturnedUuid);
      const safePublishFn = vi.fn().mockResolvedValue(safePublishSuccess);
      const loggerInfoSpy = vi.spyOn(logger, 'info');
      const eventWithDeduction = createActionableEventWithSuccessfulDeduction(validActionableEvent);

      const result = testIt(eventWithDeduction, safePublishFn, sendMessageFn, validConfig, logger);

      return expect(result)
        .resolves.toBe(validReturnedUuid)
        .then(() => {
          expect(sendMessageFn).toHaveBeenCalledWith(
            validActionableEvent.data.message,
            validActionableEvent.data.senderDetails,
            validActionableEvent.data.receiverDetails,
            validActionableEvent.correlationId,
            `${validConfig.vonageConfig.webhookBaseURL}?originalEvent%5Bdata%5D%5BreceiverDetails%5D%5Btype%5D=phone&originalEvent%5Bdata%5D%5BreceiverDetails%5D%5BphoneNumber%5D=%2B34123456789&originalEvent%5Bdata%5D%5BreceiverDetails%5D%5BcountryCode%5D=ES&originalEvent%5Bdata%5D%5Brun%5D%5BlowerBoundStartTime%5D=2023-01-01T00%3A00%3A00Z&originalEvent%5Bdata%5D%5Brun%5D%5BupperBoundStartTime%5D=2023-01-01T00%3A29%3A59Z&originalEvent%5Bdata%5D%5Brun%5D%5BslidingWindowInMinutes%5D=30&originalEvent%5Bdata%5D%5Bcalendar%5D%5Bid%5D=some%20calendar%20id&originalEvent%5Bdata%5D%5Bcalendar%5D%5Bname%5D=some%20calendar%20name&originalEvent%5Bdata%5D%5BcalendarEvent%5D%5Bid%5D=event-1&originalEvent%5Bdata%5D%5BcalendarEvent%5D%5Battendees%5D%5B0%5D%5Bid%5D=attendee%40test.com&originalEvent%5Bdata%5D%5BsenderDetails%5D%5Btype%5D=phone&originalEvent%5Bdata%5D%5BsenderDetails%5D%5BphoneNumber%5D=%2B34666999888&originalEvent%5Bdata%5D%5BsenderDetails%5D%5BcountryCode%5D=ES&originalEvent%5BcorrelationId%5D=0de651ef-535e-4d2e-b9ff-7bf43f5aaaaa&originalEvent%5BuserId%5D=b150d276-e327-51fb-b455-34a87c1c8ecc&originalEvent%5Bidp%5D=google.com&originalEvent%5BidpId%5D=123456789&originalEvent%5BeventType%5D=ActionableEventFound&creditDeductionResult%5Bsuccess%5D=true&creditDeductionResult%5Bresult%5D=Success&creditDeductionResult%5BoperationDetails%5D%5BfromBalance%5D=subscription&creditDeductionResult%5BoperationDetails%5D%5Btype%5D=deduct&creditDeductionResult%5BoperationDetails%5D%5Bquantity%5D=7&creditDeductionResult%5Bbalances%5D%5Bsubscription%5D=400&creditDeductionResult%5Bbalances%5D%5Btopup%5D=5&estimatedMessageCount%5Bmessages%5D=1`
          );
          expect(loggerInfoSpy).toHaveBeenCalledWith(
            'Publishing an event indicating the attempt to send a message'
          );
          expect(safePublishFn).toHaveBeenCalledTimes(1);
        });
    });

    function testIt(
      eventWithDeduction: EventWithSuccessfulDeduction,
      safePublishFn: () => Promise<void>,
      sendMessageFn: () => Promise<Uuid>,
      config: VonageEndpointConfig & MessagingEndpointConfig,
      logger: Logger
    ): Promise<Uuid> {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(VonageMessagingService.prototype.sendMessage).mockImplementation(sendMessageFn);
      const snsServiceMock = {
        safePublish: safePublishFn
      };
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(SnsService.withConfig).mockReturnValue(snsServiceMock as unknown as SnsService);
      const messagingService = new MessagingService(
        config,
        snsServiceMock as unknown as SnsService,
        logger
      );
      return messagingService.sendMessage(eventWithDeduction);
    }
  });
});
