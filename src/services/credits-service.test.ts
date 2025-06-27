import { Logger } from '@aws-lambda-powertools/logger';
import { logger } from '@common/powertools';
import { InsufficientCreditsError } from '@model/Errors';
import type { TierId } from '@model/PaymentPlans';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type { IdpName, UserId, UserStatus } from '@notifycal/shared/types';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { describe, expect, it, vi } from 'vitest';
import {
  CreditsService,
  type CreditAdditionResult,
  type CreditDeductionResult
} from './credits-service';

describe(CreditsService, () => {
  const validUserId = 'user-123' as UserId;
  const validCredits = 5;
  const validCountry = 'ES' as const;
  const validCountryToSMSCostCreditsMap = { ES: 2 };
  const validCreditsToAdd = 100;
  const validCreditsToResetWith = 100;
  const validTierId = 'premium' as TierId;
  const validUserStatus = 'demo' as UserStatus;

  const validUserWithCredits: Pick<UserStoreRecord<unknown>, 'Credits'> = {
    Credits: {
      SubscriptionCreditBalance: 150,
      Tier: 'good'
    }
  };

  const validUserWithZeroCredits: Pick<UserStoreRecord<unknown>, 'Credits'> = {
    Credits: {
      SubscriptionCreditBalance: 0,
      Tier: 'good'
    }
  };

  describe('deductCredits', () => {
    it('should successfully deduct credits and return success result with balance', async () => {
      const deductSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithCredits);
      const updateStatusFn = vi.fn();

      const result = await testDeductCredits(
        deductSubscriptionCreditsFn,
        updateStatusFn,
        validCredits
      );

      expect(deductSubscriptionCreditsFn).toHaveBeenCalledTimes(1);
      expect(deductSubscriptionCreditsFn).toHaveBeenCalledWith(validUserId, 10, expect.any(Logger));
      expect(result).toStrictEqual({
        success: true,
        operationId: 'Success',
        subscriptionCreditBalance: 150
      });
      expect(updateStatusFn).not.toHaveBeenCalled();
    });

    it('should handle user with no Credits object', async () => {
      const userWithoutCredits = {};
      const deductSubscriptionCreditsFn = vi.fn().mockResolvedValue(userWithoutCredits);
      const updateStatusFn = vi.fn();

      const result = await testDeductCredits(
        deductSubscriptionCreditsFn,
        updateStatusFn,
        validCredits
      );

      expect(result).toStrictEqual({
        success: true,
        operationId: 'Success',
        subscriptionCreditBalance: 0
      });
    });

    it('should handle insufficient credits error and update status to out-of-credits', async () => {
      const insufficientCreditsError = new InsufficientCreditsError(
        'some message',
        {},
        'Not enough credits'
      );
      const deductSubscriptionCreditsFn = vi.fn().mockRejectedValue(insufficientCreditsError);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testDeductCredits(
        deductSubscriptionCreditsFn,
        updateStatusFn,
        validCredits
      );

      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, 'out-of-credits');
      expect(result).toStrictEqual({
        success: false,
        operationId: 'InsufficientCredits',
        error: insufficientCreditsError
      });
    });

    it('should reject with idempotent operation error when updateStatus fails after insufficient credits', async () => {
      const insufficientCreditsError = new InsufficientCreditsError(
        'some message',
        {},
        'Not enough credits'
      );
      const updateStatusError = new Error('Failed to update status');
      const deductSubscriptionCreditsFn = vi.fn().mockRejectedValue(insufficientCreditsError);
      const updateStatusFn = vi.fn().mockRejectedValue(updateStatusError);

      await expect(
        testDeductCredits(deductSubscriptionCreditsFn, updateStatusFn, validCredits)
      ).rejects.toThrow(
        'Error while handling deductCredits-while-out-of-credits. Throwing error so that it gets retried cause the operation is idempotent. Error: Failed to update status'
      );
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Database connection failed');
      const deductSubscriptionCreditsFn = vi.fn().mockRejectedValue(unexpectedError);
      const updateStatusFn = vi.fn();

      const result = await testDeductCredits(
        deductSubscriptionCreditsFn,
        updateStatusFn,
        validCredits
      );

      expect(updateStatusFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: unexpectedError
      });
    });

    it('should calculate correct total credits for multiple credits', async () => {
      const deductSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithCredits);
      const updateStatusFn = vi.fn();

      await testDeductCredits(deductSubscriptionCreditsFn, updateStatusFn, 10);

      expect(deductSubscriptionCreditsFn).toHaveBeenCalledWith(validUserId, 20, expect.any(Logger));
    });

    it('should validate credits is positive', async () => {
      const deductSubscriptionCreditsFn = vi.fn();
      const updateStatusFn = vi.fn();

      const result = await testDeductCredits(deductSubscriptionCreditsFn, updateStatusFn, 0);

      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: new Error('Credits must be greater than 0')
      });
      expect(deductSubscriptionCreditsFn).not.toHaveBeenCalled();
    });

    it('should validate negative credits', async () => {
      const deductSubscriptionCreditsFn = vi.fn();
      const updateStatusFn = vi.fn();

      const result = await testDeductCredits(deductSubscriptionCreditsFn, updateStatusFn, -5);

      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: new Error('Credits must be greater than 0')
      });
      expect(deductSubscriptionCreditsFn).not.toHaveBeenCalled();
    });
  });

  describe('resetSubscriptionCredits', () => {
    it('should successfully reset credits and return success result with balance', async () => {
      const resetSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testResetSubscriptionCredits(
        resetSubscriptionCreditsFn,
        updateStatusFn,
        validCreditsToResetWith
      );

      expect(resetSubscriptionCreditsFn).toHaveBeenCalledTimes(1);
      expect(resetSubscriptionCreditsFn).toHaveBeenCalledWith(
        validUserId,
        validTierId,
        validCreditsToResetWith,
        expect.any(Logger)
      );
      expect(result).toStrictEqual({
        success: true,
        operationId: 'Success',
        subscriptionCreditBalance: 150
      });
      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, 'live');
    });

    it('should handle user with no Credits object', async () => {
      const userWithoutCredits = {};
      const resetSubscriptionCreditsFn = vi.fn().mockResolvedValue(userWithoutCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testResetSubscriptionCredits(
        resetSubscriptionCreditsFn,
        updateStatusFn,
        validCreditsToResetWith
      );

      expect(result).toStrictEqual({
        success: true,
        operationId: 'Success',
        subscriptionCreditBalance: 0
      });
    });

    it('should handle unexpected errors during credit reset', async () => {
      const unexpectedError = new Error('Database write failed');
      const resetSubscriptionCreditsFn = vi.fn().mockRejectedValue(unexpectedError);
      const updateStatusFn = vi.fn();

      const result = await testResetSubscriptionCredits(
        resetSubscriptionCreditsFn,
        updateStatusFn,
        validCreditsToResetWith
      );

      expect(updateStatusFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: unexpectedError
      });
    });

    it('should reject with idempotent operation error when updateStatus fails', async () => {
      const updateStatusError = new Error('Failed to update status');
      const resetSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithCredits);
      const updateStatusFn = vi.fn().mockRejectedValue(updateStatusError);

      await expect(
        testResetSubscriptionCredits(
          resetSubscriptionCreditsFn,
          updateStatusFn,
          validCreditsToResetWith
        )
      ).rejects.toThrow(
        'Error while handling resetCredits. Throwing error so that it gets retried cause the operation is idempotent. Error: Failed to update status'
      );
    });

    it('should allow zero credits', async () => {
      const resetSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithZeroCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testResetSubscriptionCredits(
        resetSubscriptionCreditsFn,
        updateStatusFn,
        0
      );

      expect(result).toStrictEqual({
        success: true,
        operationId: 'Success',
        subscriptionCreditBalance: 0
      });
    });

    it('should validate negative credits', async () => {
      const resetSubscriptionCreditsFn = vi.fn();
      const updateStatusFn = vi.fn();

      const result = await testResetSubscriptionCredits(
        resetSubscriptionCreditsFn,
        updateStatusFn,
        -10
      );

      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: new Error('Credits must be non-negative')
      });
      expect(resetSubscriptionCreditsFn).not.toHaveBeenCalled();
    });
  });

  describe('addSubscriptionCredits', () => {
    it('should successfully add credits and return success result with balance', async () => {
      const addSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testAddSubscriptionCredits(
        addSubscriptionCreditsFn,
        updateStatusFn,
        validCreditsToAdd
      );

      expect(addSubscriptionCreditsFn).toHaveBeenCalledTimes(1);
      expect(addSubscriptionCreditsFn).toHaveBeenCalledWith(
        validUserId,
        validCreditsToAdd,
        validTierId,
        expect.any(Logger)
      );
      expect(result).toStrictEqual({
        success: true,
        operationId: 'Success',
        subscriptionCreditBalance: 150
      });
      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, 'live');
    });

    it('should handle user with no Credits object', async () => {
      const userWithoutCredits = {};
      const addSubscriptionCreditsFn = vi.fn().mockResolvedValue(userWithoutCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testAddSubscriptionCredits(
        addSubscriptionCreditsFn,
        updateStatusFn,
        validCreditsToAdd
      );

      expect(result).toStrictEqual({
        success: true,
        operationId: 'Success',
        subscriptionCreditBalance: 0
      });
    });

    it('should handle unexpected errors during credit addition', async () => {
      const unexpectedError = new Error('Database write failed');
      const addSubscriptionCreditsFn = vi.fn().mockRejectedValue(unexpectedError);
      const updateStatusFn = vi.fn();

      const result = await testAddSubscriptionCredits(
        addSubscriptionCreditsFn,
        updateStatusFn,
        validCreditsToAdd
      );

      expect(updateStatusFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: unexpectedError
      });
    });

    it('should return error result (not reject) when updateStatus fails for non-idempotent operation', async () => {
      const updateStatusError = new Error('Failed to update status');
      const addSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithCredits);
      const updateStatusFn = vi.fn().mockRejectedValue(updateStatusError);
      const loggerErrorSpy = vi.spyOn(logger, 'error');

      const result = await testAddSubscriptionCredits(
        addSubscriptionCreditsFn,
        updateStatusFn,
        validCreditsToAdd
      );

      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: updateStatusError
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'The user status update has failed after the non idempotent operation addCredits in credit service. We cannot retry...',
        { error: updateStatusError }
      );
    });

    it('should validate credits is positive', async () => {
      const addSubscriptionCreditsFn = vi.fn();
      const updateStatusFn = vi.fn();

      const result = await testAddSubscriptionCredits(addSubscriptionCreditsFn, updateStatusFn, 0);

      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: new Error('Credits to add must be greater or equal than 0')
      });
      expect(addSubscriptionCreditsFn).not.toHaveBeenCalled();
    });

    it('should validate negative credits', async () => {
      const addSubscriptionCreditsFn = vi.fn();
      const updateStatusFn = vi.fn();

      const result = await testAddSubscriptionCredits(
        addSubscriptionCreditsFn,
        updateStatusFn,
        -50
      );

      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: new Error('Credits to add must be greater or equal than 0')
      });
      expect(addSubscriptionCreditsFn).not.toHaveBeenCalled();
    });
  });

  describe('deleteSubscriptionCredits', () => {
    it('should successfully delete credits and return success result with zero balance', async () => {
      const deleteSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithZeroCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testDeleteSubscriptionCredits(
        deleteSubscriptionCreditsFn,
        updateStatusFn
      );

      expect(deleteSubscriptionCreditsFn).toHaveBeenCalledTimes(1);
      expect(deleteSubscriptionCreditsFn).toHaveBeenCalledWith(validUserId, expect.any(Logger));
      expect(result).toStrictEqual({
        success: true,
        operationId: 'Success',
        subscriptionCreditBalance: 0
      });
      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, validUserStatus);
    });

    it('should handle user with no Credits object', async () => {
      const userWithoutCredits = {};
      const deleteSubscriptionCreditsFn = vi.fn().mockResolvedValue(userWithoutCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testDeleteSubscriptionCredits(
        deleteSubscriptionCreditsFn,
        updateStatusFn
      );

      expect(result).toStrictEqual({
        success: true,
        operationId: 'Success',
        subscriptionCreditBalance: 0
      });
    });

    it('should handle unexpected errors during credit deletion', async () => {
      const unexpectedError = new Error('Database write failed');
      const deleteSubscriptionCreditsFn = vi.fn().mockRejectedValue(unexpectedError);
      const updateStatusFn = vi.fn();

      const result = await testDeleteSubscriptionCredits(
        deleteSubscriptionCreditsFn,
        updateStatusFn
      );

      expect(updateStatusFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: unexpectedError
      });
    });

    it('should reject with idempotent operation error when updateStatus fails', async () => {
      const updateStatusError = new Error('Failed to update status');
      const deleteSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithZeroCredits);
      const updateStatusFn = vi.fn().mockRejectedValue(updateStatusError);

      await expect(
        testDeleteSubscriptionCredits(deleteSubscriptionCreditsFn, updateStatusFn)
      ).rejects.toThrow(
        'Error while handling deleteCredits. Throwing error so that it gets retried cause the operation is idempotent. Error: Failed to update status'
      );
    });

    it('should update to different status based on parameter', async () => {
      const deleteSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithZeroCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);
      const customStatus = 'suspended' as UserStatus;

      await testDeleteSubscriptionCredits(
        deleteSubscriptionCreditsFn,
        updateStatusFn,
        validUserId,
        customStatus
      );

      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, customStatus);
    });
  });

  function testDeductCredits(
    deductSubscriptionCreditsFn: () => Promise<Pick<UserStoreRecord<unknown>, 'Credits'>>,
    updateStatusFn: () => Promise<void>,
    credits: number,
    userId: UserId = validUserId,
    country: 'ES' = validCountry,
    countryToSMSCostCreditsMap = validCountryToSMSCostCreditsMap
  ): Promise<CreditDeductionResult> {
    const userStoreMock = {
      deductSubscriptionCredits: deductSubscriptionCreditsFn,
      updateStatus: updateStatusFn
    } as unknown as UserBaseStore<IdpName>;

    const creditsService = new CreditsService(userStoreMock, logger);
    return creditsService.deductCredits(userId, credits, country, countryToSMSCostCreditsMap);
  }

  function testResetSubscriptionCredits(
    resetSubscriptionCreditsFn: () => Promise<Pick<UserStoreRecord<unknown>, 'Credits'>>,
    updateStatusFn: () => Promise<void>,
    credits: number,
    userId: UserId = validUserId,
    tierId: TierId = validTierId
  ): Promise<CreditAdditionResult> {
    const userStoreMock = {
      resetSubscriptionCredits: resetSubscriptionCreditsFn,
      updateStatus: updateStatusFn
    } as unknown as UserBaseStore<IdpName>;

    const creditsService = new CreditsService(userStoreMock, logger);
    return creditsService.resetSubscriptionCredits(userId, credits, tierId);
  }

  function testAddSubscriptionCredits(
    addSubscriptionCreditsFn: () => Promise<Pick<UserStoreRecord<unknown>, 'Credits'>>,
    updateStatusFn: () => Promise<void>,
    credits: number,
    userId: UserId = validUserId,
    tierId: TierId = validTierId
  ): Promise<CreditAdditionResult> {
    const userStoreMock = {
      addSubscriptionCredits: addSubscriptionCreditsFn,
      updateStatus: updateStatusFn
    } as unknown as UserBaseStore<IdpName>;

    const creditsService = new CreditsService(userStoreMock, logger);
    return creditsService.addSubscriptionCredits(userId, credits, tierId);
  }

  function testDeleteSubscriptionCredits(
    deleteSubscriptionCreditsFn: () => Promise<Pick<UserStoreRecord<unknown>, 'Credits'>>,
    updateStatusFn: () => Promise<void>,
    userId: UserId = validUserId,
    status: UserStatus = validUserStatus
  ): Promise<CreditDeductionResult> {
    const userStoreMock = {
      deleteSubscriptionCredits: deleteSubscriptionCreditsFn,
      updateStatus: updateStatusFn
    } as unknown as UserBaseStore<IdpName>;

    const creditsService = new CreditsService(userStoreMock, logger);
    return creditsService.deleteSubscriptionCredits(userId, status);
  }
});
