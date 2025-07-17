import { categorizeError, type MessageDeliveryErrorFault } from '@model/vendor/vonage/errors';
/* eslint-disable camelcase */
import { logger } from '@common/powertools';
import type { WebhookCorrelationData } from '@lambdas/api/post-event-reminder-delivery-status-webhook/schema';
import type { CountryToSMSCostCreditsMap } from '@model/Config';
import type {
  CreditAdditionResult,
  CreditDeductionResult,
  CreditDeductionSuccess,
  DemoCounterDecrementResult
} from '@model/Credits';
import type { VonageWebhookMessageStatusPayload } from '@model/vendor/vonage/schemas';
import type { CorrelationId, IdpId, IdpName, UserId, Uuid } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { validActionableEventEvent } from '@testing/data/app-events';
import { v4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { CreditAdjustmentService } from './credit-adjustment-service';
import type { CreditsService } from './credits-service';

vi.mock('@model/vendor/vonage/errors');

const validUserId: UserId = 'b150d276-e327-51fb-b455-34a87c1c8ecc' as UserId;
const validIdpName: IdpName = 'google.com';
const validCountryToSMSCostCreditsMap: CountryToSMSCostCreditsMap = { ES: 2 };

const validCreditDeductionSuccess: CreditDeductionSuccess<'deduct'> = {
  success: true,
  result: 'Success',
  operationDetails: {
    fromBalance: 'subscription',
    type: 'deduct',
    quantity: 10
  },
  balances: {
    subscription: 90,
    topup: 0
  }
};

const validCreditAdditionResult: CreditAdditionResult<'restore'> = {
  success: true,
  result: 'Success',
  operationDetails: {
    fromBalance: 'subscription',
    type: 'restore',
    quantity: 10
  },
  balances: {
    subscription: 100,
    topup: 0
  }
};

const validDemoCounterDecrementResult: DemoCounterDecrementResult = {
  success: true,
  result: 'Success',
  demoRemindersCount: 5
};

const validDeliveredSMSStatus: VonageWebhookMessageStatusPayload = {
  status: 'delivered',
  message_uuid: v4() as Uuid,
  channel: 'sms',
  to: '34123456789',
  from: '34666999888',
  timestamp: new Date().toISOString(),
  client_ref: 'test-client-ref',
  sms: {
    count_total: 1
  }
};

const validRejectedSMSStatus: VonageWebhookMessageStatusPayload = {
  status: 'rejected',
  message_uuid: v4() as Uuid,
  channel: 'sms',
  to: '34123456789',
  from: '34666999888',
  timestamp: new Date().toISOString(),
  client_ref: 'test-client-ref',
  sms: {
    count_total: 1
  },
  error: {
    error: {
      type: 'https://developer.vonage.com/api-errors/messages#rejected',
      title: '1030',
      detail: 'Internal error  -  There was an error processing your request in the Platform',
      instance: 'bf0ca0bf-5a34-4884-9bfb-4de5e4e5e5e5'
    }
  }
};

const validUndeliverableSMSStatus: VonageWebhookMessageStatusPayload = {
  status: 'undeliverable',
  message_uuid: v4() as Uuid,
  channel: 'sms',
  to: '34123456789',
  from: '34666999888',
  timestamp: new Date().toISOString(),
  client_ref: 'test-client-ref',
  sms: {
    count_total: 1
  },
  error: {
    error: {
      type: 'https://developer.vonage.com/api-errors/messages#undeliverable',
      title: 'Undeliverable',
      detail: 'Temporarily unavailable',
      instance: 'bf0ca0bf-5a34-4884-9bfb-4de5e4e5e5e5'
    }
  }
};

const validRCSStatus: VonageWebhookMessageStatusPayload = {
  status: 'read',
  message_uuid: v4() as Uuid,
  channel: 'rcs',
  to: '34123456789',
  from: 'test-sender-id',
  timestamp: new Date().toISOString(),
  client_ref: 'test-client-ref'
};

const validActionableEventWebhookData: WebhookCorrelationData = {
  originalEvent: validActionableEventEvent,
  creditDeductionResult: validCreditDeductionSuccess,
  estimatedMessageCount: {
    encoding: 'GSM_7BIT',
    length: 50,
    characterPerMessage: 160,
    inCurrentMessage: 50,
    remaining: 110,
    messages: 1
  }
};

const validDemoReminderWebhookData: WebhookCorrelationData = {
  originalEvent: {
    correlationId: v4() as CorrelationId,
    eventType: 'DemoReminderToBeSent',
    userId: validUserId,
    idp: validIdpName,
    idpId: '123456789' as IdpId,
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
      message: 'Demo reminder message'
    }
  },
  creditDeductionResult: {
    success: true,
    result: 'Success',
    demoRemindersCount: 5
  },
  estimatedMessageCount: {
    encoding: 'GSM_7BIT',
    length: 50,
    characterPerMessage: 160,
    inCurrentMessage: 50,
    remaining: 110,
    messages: 1
  }
};

describe(CreditAdjustmentService, () => {
  describe('processWebhookAdjustment', () => {
    it('should return empty result when no message count found', () => {
      const statusWithoutCount: VonageWebhookMessageStatusPayload = {
        status: 'delivered',
        message_uuid: v4() as Uuid,
        channel: 'sms',
        to: '34123456789',
        from: '34666999888',
        timestamp: new Date().toISOString(),
        client_ref: 'test-client-ref'
      };

      const categoryErrorFn = vi.fn().mockReturnValue('ok');
      const validRestoreCredits = vi.fn().mockResolvedValue(validCreditAdditionResult);
      const validDecrementDemoReminderCount = vi
        .fn()
        .mockResolvedValue(validDemoCounterDecrementResult);

      return testIt(
        validActionableEventWebhookData,
        statusWithoutCount,
        categoryErrorFn,
        validRestoreCredits,
        validDecrementDemoReminderCount
      ).then((result) => {
        expect(result).toStrictEqual({});
        expect(validRestoreCredits).not.toHaveBeenCalled();
        expect(validDecrementDemoReminderCount).not.toHaveBeenCalled();
      });
    });

    it('should process ActionableEventFound adjustment with delivered SMS', () => {
      const validRestoreCredits = vi.fn().mockResolvedValue(validCreditAdditionResult);
      const validDecrementDemoReminderCount = vi
        .fn()
        .mockResolvedValue(validDemoCounterDecrementResult);
      const categoryErrorFn = vi.fn().mockReturnValue('ok');

      return testIt(
        validActionableEventWebhookData,
        validDeliveredSMSStatus,
        categoryErrorFn,
        validRestoreCredits,
        validDecrementDemoReminderCount
      ).then((result) => {
        expect(result).toStrictEqual({});
        expect(validRestoreCredits).not.toHaveBeenCalled();
        expect(validDecrementDemoReminderCount).not.toHaveBeenCalled();
      });
    });

    it('should process ActionableEventFound adjustment with transient error', () => {
      const validRestoreCredits = vi.fn().mockResolvedValue(validCreditAdditionResult);
      const validDecrementDemoReminderCount = vi
        .fn()
        .mockResolvedValue(validDemoCounterDecrementResult);
      const categoryErrorFn = vi.fn().mockReturnValue('transient');

      return testIt(
        validActionableEventWebhookData,
        validUndeliverableSMSStatus,
        categoryErrorFn,
        validRestoreCredits,
        validDecrementDemoReminderCount
      ).then((result) => {
        expect(result).toStrictEqual({
          creditAdjustmentResult: validCreditAdditionResult
        });
        expect(validRestoreCredits).toHaveBeenCalledWith(validUserId, 10, 'subscription');
        expect(validDecrementDemoReminderCount).not.toHaveBeenCalled();
      });
    });

    it('should process ActionableEventFound adjustment with overcharge', () => {
      const statusWithHigherCount: VonageWebhookMessageStatusPayload = {
        status: 'delivered',
        message_uuid: v4() as Uuid,
        channel: 'sms',
        to: '34123456789',
        from: '34666999888',
        timestamp: new Date().toISOString(),
        client_ref: 'test-client-ref',
        sms: {
          count_total: 3
        }
      };

      const categoryErrorFn = vi.fn().mockReturnValue('ok');
      const validRestoreCredits = vi.fn().mockResolvedValue(validCreditAdditionResult);
      const validDecrementDemoReminderCount = vi
        .fn()
        .mockResolvedValue(validDemoCounterDecrementResult);

      return testIt(
        validActionableEventWebhookData,
        statusWithHigherCount,
        categoryErrorFn,
        validRestoreCredits,
        validDecrementDemoReminderCount
      ).then((result) => {
        expect(result).toStrictEqual({
          creditAdjustmentResult: validCreditAdditionResult
        });
        expect(validRestoreCredits).toHaveBeenCalledWith(validUserId, 4, 'subscription');
        expect(validDecrementDemoReminderCount).not.toHaveBeenCalled();
      });
    });

    it('should process ActionableEventFound adjustment with undercharge', () => {
      const webhookDataWithHigherEstimate: WebhookCorrelationData = {
        ...validActionableEventWebhookData,
        estimatedMessageCount: {
          encoding: 'GSM_7BIT',
          length: 150,
          characterPerMessage: 160,
          inCurrentMessage: 150,
          remaining: 330,
          messages: 3
        }
      };

      const categoryErrorFn = vi.fn().mockReturnValue('ok');
      const validDeductCredits = vi.fn().mockResolvedValue(validCreditDeductionSuccess);
      const validDecrementDemoReminderCount = vi
        .fn()
        .mockResolvedValue(validDemoCounterDecrementResult);

      return testIt(
        webhookDataWithHigherEstimate,
        validDeliveredSMSStatus,
        categoryErrorFn,
        vi.fn(),
        validDecrementDemoReminderCount,
        validDeductCredits
      ).then((result) => {
        expect(result).toStrictEqual({
          creditAdjustmentResult: validCreditDeductionSuccess
        });
        expect(validDeductCredits).toHaveBeenCalledWith(validUserId, 4);
        expect(validDecrementDemoReminderCount).not.toHaveBeenCalled();
      });
    });

    it('should process DemoReminderToBeSent adjustment with delivered SMS', () => {
      const validRestoreCredits = vi.fn().mockResolvedValue(validCreditAdditionResult);
      const validDecrementDemoReminderCount = vi
        .fn()
        .mockResolvedValue(validDemoCounterDecrementResult);

      const categoryErrorFn = vi.fn().mockReturnValue('ok');
      return testIt(
        validDemoReminderWebhookData,
        validDeliveredSMSStatus,
        categoryErrorFn,
        validRestoreCredits,
        validDecrementDemoReminderCount
      ).then((result) => {
        expect(result).toStrictEqual({});
        expect(validRestoreCredits).not.toHaveBeenCalled();
        expect(validDecrementDemoReminderCount).not.toHaveBeenCalled();
      });
    });

    it('should process DemoReminderToBeSent adjustment with transient error', () => {
      const validRestoreCredits = vi.fn().mockResolvedValue(validCreditAdditionResult);
      const validDecrementDemoReminderCount = vi
        .fn()
        .mockResolvedValue(validDemoCounterDecrementResult);

      const categoryErrorFn = vi.fn().mockReturnValue('transient');
      return testIt(
        validDemoReminderWebhookData,
        validUndeliverableSMSStatus,
        categoryErrorFn,
        validRestoreCredits,
        validDecrementDemoReminderCount
      ).then((result) => {
        expect(result).toStrictEqual({
          demoCounterAdjustmentResult: validDemoCounterDecrementResult
        });
        expect(validRestoreCredits).not.toHaveBeenCalled();
        expect(validDecrementDemoReminderCount).toHaveBeenCalledWith(validUserId);
      });
    });

    it('should process DemoReminderToBeSent adjustment with overcharge', () => {
      const statusWithHigherCount: VonageWebhookMessageStatusPayload = {
        status: 'delivered',
        message_uuid: v4() as Uuid,
        channel: 'sms',
        to: '34123456789',
        from: '34666999888',
        timestamp: new Date().toISOString(),
        client_ref: 'test-client-ref',
        sms: {
          count_total: 3
        }
      };

      const categoryErrorFn = vi.fn().mockReturnValue('ok');
      const validRestoreCredits = vi.fn().mockResolvedValue(validCreditAdditionResult);
      const validDecrementDemoReminderCount = vi
        .fn()
        .mockResolvedValue(validDemoCounterDecrementResult);

      return testIt(
        validDemoReminderWebhookData,
        statusWithHigherCount,
        categoryErrorFn,
        validRestoreCredits,
        validDecrementDemoReminderCount
      ).then((result) => {
        expect(result).toStrictEqual({
          demoCounterAdjustmentResult: validDemoCounterDecrementResult
        });
        expect(validRestoreCredits).not.toHaveBeenCalled();
        expect(validDecrementDemoReminderCount).toHaveBeenCalledWith(validUserId);
      });
    });

    it('should skip DemoReminderToBeSent adjustment with undercharge', () => {
      const webhookDataWithHigherEstimate: WebhookCorrelationData = {
        ...validDemoReminderWebhookData,
        estimatedMessageCount: {
          encoding: 'GSM_7BIT',
          length: 150,
          characterPerMessage: 160,
          inCurrentMessage: 150,
          remaining: 330,
          messages: 3
        }
      };

      const categoryErrorFn = vi.fn().mockReturnValue('ok');
      const validRestoreCredits = vi.fn().mockResolvedValue(validCreditAdditionResult);
      const validDecrementDemoReminderCount = vi
        .fn()
        .mockResolvedValue(validDemoCounterDecrementResult);

      return testIt(
        webhookDataWithHigherEstimate,
        validDeliveredSMSStatus,
        categoryErrorFn,
        validRestoreCredits,
        validDecrementDemoReminderCount
      ).then((result) => {
        expect(result).toStrictEqual({});
        expect(validRestoreCredits).not.toHaveBeenCalled();
        expect(validDecrementDemoReminderCount).not.toHaveBeenCalled();
      });
    });

    it('should skip RCS message status without adjustment', () => {
      const validRestoreCredits = vi.fn().mockResolvedValue(validCreditAdditionResult);
      const validDecrementDemoReminderCount = vi
        .fn()
        .mockResolvedValue(validDemoCounterDecrementResult);

      const categoryErrorFn = vi.fn().mockReturnValue('ok');
      return testIt(
        validActionableEventWebhookData,
        validRCSStatus,
        categoryErrorFn,
        validRestoreCredits,
        validDecrementDemoReminderCount
      ).then((result) => {
        expect(result).toStrictEqual({});
        expect(validRestoreCredits).not.toHaveBeenCalled();
        expect(validDecrementDemoReminderCount).not.toHaveBeenCalled();
      });
    });

    it("should handle user's fault error properly", () => {
      const categoryErrorFn = vi.fn().mockReturnValue('user');
      const validRestoreCredits = vi.fn().mockResolvedValue(validCreditAdditionResult);
      const validDecrementDemoReminderCount = vi
        .fn()
        .mockResolvedValue(validDemoCounterDecrementResult);

      return testIt(
        validActionableEventWebhookData,
        validRejectedSMSStatus,
        categoryErrorFn,
        validRestoreCredits,
        validDecrementDemoReminderCount
      ).then((result) => {
        expect(result).toStrictEqual({});
        expect(validRestoreCredits).not.toHaveBeenCalled();
        expect(validDecrementDemoReminderCount).not.toHaveBeenCalled();
      });
    });
  });

  function testIt(
    webhookData: WebhookCorrelationData,
    vonageStatus: VonageWebhookMessageStatusPayload,
    categorizeErrorFn: () => MessageDeliveryErrorFault | 'ok',
    restoreCreditsFn: () => Promise<CreditAdditionResult<'restore'>>,
    decrementDemoReminderCountFn: () => Promise<DemoCounterDecrementResult>,
    deductCreditsFn?: () => Promise<CreditDeductionResult<'deduct'>>
  ) {
    const mockCreditsService = {
      restoreCredits: restoreCreditsFn,
      decrementDemoReminderCount: decrementDemoReminderCountFn,
      deductCredits: deductCreditsFn || vi.fn()
    };

    const service = new CreditAdjustmentService(
      validCountryToSMSCostCreditsMap,
      mockCreditsService as unknown as CreditsService<IdpName>,
      logger
    );

    vi.mocked(categorizeError).mockImplementation(categorizeErrorFn);

    return service.processWebhookAdjustment(webhookData, vonageStatus);
  }
});
