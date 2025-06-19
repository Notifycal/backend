import { InsufficientCreditsError } from '@model/Errors';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type { IdpName, UserId } from '@notifycal/shared/types';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { describe, expect, it, vi } from 'vitest';
import {
  CreditsService,
  type CreditAdditionResult,
  type CreditDeductionResult
} from './credits-service';

describe(CreditsService, () => {
  const validUserId = 'user-123' as UserId;
  const validUnits = 5;
  const validCountry = 'ES' as const;
  const validCountryToSMSCostCreditsMap = { ES: 2 };
  const validCreditsToAdd = 100;

  const validUserWithCredits: Pick<UserStoreRecord<unknown>, 'UserCredits'> = {
    UserCredits: {
      SubscriptionCreditBalance: 150,
      Tier: 'good'
    }
  };

  describe('deductCredits', () => {
    it('should successfully deduct credits and return success result with balance', async () => {
      const deductCreditsFn = vi.fn().mockResolvedValue(validUserWithCredits);
      const updateStatusFn = vi.fn();

      const result = await testDeductCredits(deductCreditsFn, updateStatusFn);

      expect(deductCreditsFn).toHaveBeenCalledTimes(1);
      expect(deductCreditsFn).toHaveBeenCalledWith(validUserId, 10);
      expect(result).toStrictEqual({
        success: true,
        operationId: 'Success',
        subscriptionCreditBalance: 150
      });
      expect(updateStatusFn).not.toHaveBeenCalled();
    });

    it('should handle insufficient credits error', async () => {
      const insufficientCreditsError = new InsufficientCreditsError(
        'some message',
        {},
        'Not enough credits'
      );
      const deductCreditsFn = vi.fn().mockRejectedValue(insufficientCreditsError);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testDeductCredits(deductCreditsFn, updateStatusFn);

      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, 'out-of-credits');
      expect(result).toStrictEqual({
        success: false,
        operationId: 'InsufficientCredits',
        error: insufficientCreditsError
      });
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Database connection failed');
      const deductCreditsFn = vi.fn().mockRejectedValue(unexpectedError);
      const updateStatusFn = vi.fn();

      const result = await testDeductCredits(deductCreditsFn, updateStatusFn);

      expect(updateStatusFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: unexpectedError
      });
    });
  });

  function testDeductCredits(
    deductCreditsFn: () => Promise<CreditDeductionResult>,
    updateStatusFn: () => Promise<void>,
    userId: UserId = validUserId,
    units: number = validUnits,
    country: 'ES' = validCountry,
    countryToSMSCostCreditsMap = validCountryToSMSCostCreditsMap
  ): Promise<CreditDeductionResult> {
    const userStoreMock = {
      deductCredits: deductCreditsFn,
      updateStatus: updateStatusFn
    } as unknown as UserBaseStore<IdpName>;

    const creditsService = new CreditsService(userStoreMock);
    return creditsService.deductCredits(userId, units, country, countryToSMSCostCreditsMap);
  }

  describe('resetSubscriptionCredits', () => {
    it('should successfully reset credits and return success result with balance', async () => {
      const addCreditsFn = vi.fn().mockResolvedValue(validUserWithCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testResetSubscriptionCredits(addCreditsFn, updateStatusFn);

      expect(addCreditsFn).toHaveBeenCalledTimes(1);
      expect(addCreditsFn).toHaveBeenCalledWith(validUserId, validCreditsToAdd);
      expect(result).toStrictEqual({
        success: true,
        operationId: 'Success',
        subscriptionCreditBalance: 150
      });
      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, 'live');
    });

    it('should handle unexpected errors during credit reset', async () => {
      const unexpectedError = new Error('Database write failed');
      const addCreditsFn = vi.fn().mockRejectedValue(unexpectedError);
      const updateStatusFn = vi.fn();

      const result = await testResetSubscriptionCredits(addCreditsFn, updateStatusFn);

      expect(updateStatusFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: unexpectedError
      });
    });

    function testResetSubscriptionCredits(
      resetSubscriptionCreditsFn: () => Promise<CreditAdditionResult>,
      updateStatusFn: () => Promise<void>,
      userId: UserId = validUserId,
      credits: number = validCreditsToAdd
    ): Promise<CreditAdditionResult> {
      const userStoreMock = {
        resetSubscriptionCredits: resetSubscriptionCreditsFn,
        updateStatus: updateStatusFn
      } as unknown as UserBaseStore<IdpName>;

      const creditsService = new CreditsService(userStoreMock);
      return creditsService.resetSubscriptionCredits(userId, credits);
    }
  });
});
