import { Logger } from '@aws-lambda-powertools/logger';
import { logger } from '@common/powertools';
import type {
  CreditAdditionResult,
  CreditDeductionResult,
  DemoCounterIncrementResult
} from '@model/Credits';
import { InsufficientCreditsError } from '@model/Errors';
import type { UserStoreRecord, UserStoreRecordCredits } from '@model/store/UserStoreRecord';
import type { IdpName, TierId, TopupId, UserId, UserStatus } from '@notifycal/shared/types';
import type {
  CreditOperationPersistenceResult,
  UserBaseStore
} from '@services/stores/user-base-store';
import { describe, expect, it, vi } from 'vitest';
import { CreditsService } from './credits-service';

describe(CreditsService, () => {
  const validUserId = 'user-123' as UserId;
  const validCredits = 5;
  const validCreditsToAdd = 100;
  const validCreditsToResetWith = 100;
  const validTierId = 'premium' as TierId;
  const validTopupId = 'topup-500' as TopupId;
  const validUserStatus = 'demo' as UserStatus;
  const validDemoReminderLimit = 3;

  const validUserWithCredits: UserStoreRecordCredits = {
    Credits: {
      SubscriptionCreditBalance: 150,
      Tier: 'good',
      TopupCreditBalance: 44
    }
  };

  const validUserWithZeroCredits: UserStoreRecordCredits = {
    Credits: {
      SubscriptionCreditBalance: 0,
      Tier: 'good',
      TopupCreditBalance: 0
    }
  };

  const validSubscriptionProduct = { type: 'subscription' as const, id: validTierId };
  const validTopupProduct = { type: 'topup' as const, id: validTopupId };

  describe('deductCredits', () => {
    it('should successfully deduct credits and return success result with balance', async () => {
      const creditOperationPersistenceResult: CreditOperationPersistenceResult = {
        user: validUserWithCredits,
        balance: 'subscription',
        quantity: validCredits
      };
      const deductCreditsFn = vi.fn().mockResolvedValue(creditOperationPersistenceResult);
      const updateStatusFn = vi.fn();

      const result = await testDeductCredits(deductCreditsFn, updateStatusFn, validCredits);

      expect(deductCreditsFn).toHaveBeenCalledTimes(1);
      expect(deductCreditsFn).toHaveBeenCalledWith(validUserId, validCredits, expect.any(Logger));
      expect(result).toStrictEqual({
        success: true,
        result: 'Success',
        operationDetails: {
          fromBalance: 'subscription',
          type: 'deduct',
          quantity: validCredits
        },
        balances: {
          subscription: validUserWithCredits.Credits?.SubscriptionCreditBalance,
          topup: validUserWithCredits.Credits?.TopupCreditBalance
        }
      });
      expect(updateStatusFn).not.toHaveBeenCalled();
    });

    it('should handle insufficient credits error and update status to out-of-credits', async () => {
      const insufficientCreditsError = new InsufficientCreditsError(
        'some message',
        {},
        'Not enough credits'
      );
      const deductCreditsFn = vi.fn().mockRejectedValue(insufficientCreditsError);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testDeductCredits(deductCreditsFn, updateStatusFn, validCredits);

      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, 'out-of-credits');
      expect(result).toStrictEqual({
        success: false,
        result: 'InsufficientCredits',
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
      const deductCreditsFn = vi.fn().mockRejectedValue(insufficientCreditsError);
      const updateStatusFn = vi.fn().mockRejectedValue(updateStatusError);

      await expect(
        testDeductCredits(deductCreditsFn, updateStatusFn, validCredits)
      ).rejects.toThrow(
        'Error while handling deductCredits-while-out-of-credits. Throwing error so that it gets retried cause the operation is idempotent. Error: Failed to update status'
      );
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Database connection failed');
      const deductCreditsFn = vi.fn().mockRejectedValue(unexpectedError);
      const updateStatusFn = vi.fn();

      const result = await testDeductCredits(deductCreditsFn, updateStatusFn, validCredits);

      expect(updateStatusFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        success: false,
        result: 'UnknownError',
        error: unexpectedError
      });
    });

    it('should validate credits is positive', async () => {
      const deductCreditsFn = vi.fn();
      const updateStatusFn = vi.fn();

      const result = await testDeductCredits(deductCreditsFn, updateStatusFn, 0);

      expect(result).toStrictEqual({
        success: false,
        result: 'BadRequestError',
        error: new Error('Credits must be greater than 0. Credits: 0')
      });
      expect(deductCreditsFn).not.toHaveBeenCalled();
    });

    it('should validate negative credits', async () => {
      const deductCreditsFn = vi.fn();
      const updateStatusFn = vi.fn();

      const result = await testDeductCredits(deductCreditsFn, updateStatusFn, -5);

      expect(result).toStrictEqual({
        success: false,
        result: 'BadRequestError',
        error: new Error('Credits must be greater than 0. Credits: -5')
      });
      expect(deductCreditsFn).not.toHaveBeenCalled();
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
        result: 'Success',
        operationDetails: {
          fromBalance: 'subscription',
          type: 'reset'
        },
        balances: {
          subscription: 150,
          topup: 44
        }
      });
      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, 'live');
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
        result: 'UnknownError',
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
        result: 'Success',
        operationDetails: {
          fromBalance: 'subscription',
          type: 'reset'
        },
        balances: {
          subscription: 0,
          topup: 0
        }
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
        result: 'UnknownError',
        error: new Error('Credits must be non-negative')
      });
      expect(resetSubscriptionCreditsFn).not.toHaveBeenCalled();
    });
  });

  describe('addCredits', () => {
    it('should successfully add subscription credits and return success result with balance', async () => {
      const addCreditsFn = vi.fn().mockResolvedValue(validUserWithCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testAddCredits(
        addCreditsFn,
        updateStatusFn,
        validCreditsToAdd,
        validSubscriptionProduct
      );

      expect(addCreditsFn).toHaveBeenCalledTimes(1);
      expect(addCreditsFn).toHaveBeenCalledWith(
        validUserId,
        validCreditsToAdd,
        validSubscriptionProduct.type,
        expect.any(Logger),
        validSubscriptionProduct.id
      );
      expect(result).toStrictEqual({
        success: true,
        result: 'Success',
        operationDetails: {
          fromBalance: 'subscription',
          type: 'add',
          quantity: validCreditsToAdd
        },
        balances: {
          subscription: 150,
          topup: 44
        }
      });
      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, 'live');
    });

    it('should successfully add topup credits and return success result with balance', async () => {
      const addCreditsFn = vi.fn().mockResolvedValue(validUserWithCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testAddCredits(
        addCreditsFn,
        updateStatusFn,
        validCreditsToAdd,
        validTopupProduct
      );

      expect(addCreditsFn).toHaveBeenCalledWith(
        validUserId,
        validCreditsToAdd,
        validTopupProduct.type,
        expect.any(Logger),
        undefined
      );
      expect(result).toStrictEqual({
        success: true,
        result: 'Success',
        operationDetails: {
          fromBalance: 'topup',
          type: 'add',
          quantity: validCreditsToAdd
        },
        balances: {
          subscription: 150,
          topup: 44
        }
      });
      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, 'live');
    });

    it('should handle unexpected errors during credit addition', async () => {
      const unexpectedError = new Error('Database write failed');
      const addCreditsFn = vi.fn().mockRejectedValue(unexpectedError);
      const updateStatusFn = vi.fn();

      const result = await testAddCredits(
        addCreditsFn,
        updateStatusFn,
        validCreditsToAdd,
        validSubscriptionProduct
      );

      expect(updateStatusFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        success: false,
        result: 'UnknownError',
        error: unexpectedError
      });
    });

    it('should return error result (not reject) when updateStatus fails for non-idempotent operation', async () => {
      const updateStatusError = new Error('Failed to update status');
      const addCreditsFn = vi.fn().mockResolvedValue(validUserWithCredits);
      const updateStatusFn = vi.fn().mockRejectedValue(updateStatusError);
      const loggerErrorSpy = vi.spyOn(logger, 'error');

      const result = await testAddCredits(
        addCreditsFn,
        updateStatusFn,
        validCreditsToAdd,
        validSubscriptionProduct
      );

      expect(result).toStrictEqual({
        success: false,
        result: 'UnknownError',
        error: updateStatusError
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'The user status update has failed after the non idempotent operation addCredits in credit service. We cannot retry...',
        { error: updateStatusError }
      );
    });

    it('should validate credits is positive', async () => {
      const addCreditsFn = vi.fn();
      const updateStatusFn = vi.fn();

      const result = await testAddCredits(
        addCreditsFn,
        updateStatusFn,
        0,
        validSubscriptionProduct
      );

      expect(result).toStrictEqual({
        success: false,
        result: 'BadRequestError',
        error: new Error('Credits must be greater than 0. Credits: 0')
      });
      expect(addCreditsFn).not.toHaveBeenCalled();
    });

    it('should validate negative credits', async () => {
      const addCreditsFn = vi.fn();
      const updateStatusFn = vi.fn();

      const result = await testAddCredits(
        addCreditsFn,
        updateStatusFn,
        -50,
        validSubscriptionProduct
      );

      expect(result).toStrictEqual({
        success: false,
        result: 'BadRequestError',
        error: new Error('Credits must be greater than 0. Credits: -50')
      });
      expect(addCreditsFn).not.toHaveBeenCalled();
    });
  });

  describe('clearSubscriptionCredits', () => {
    it('should successfully delete credits and return success result with zero balance', async () => {
      const clearSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithZeroCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);

      const result = await testClearSubscriptionCredits(clearSubscriptionCreditsFn, updateStatusFn);

      expect(clearSubscriptionCreditsFn).toHaveBeenCalledTimes(1);
      expect(clearSubscriptionCreditsFn).toHaveBeenCalledWith(validUserId, expect.any(Logger));
      expect(result).toStrictEqual({
        success: true,
        result: 'Success',
        operationDetails: {
          fromBalance: 'subscription',
          type: 'clear'
        },
        balances: {
          subscription: 0,
          topup: 0
        }
      });
      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, validUserStatus);
    });

    it('should handle unexpected errors during credit deletion', async () => {
      const unexpectedError = new Error('Database write failed');
      const clearSubscriptionCreditsFn = vi.fn().mockRejectedValue(unexpectedError);
      const updateStatusFn = vi.fn();
      const loggerWarnSpy = vi.spyOn(logger, 'warn');

      const result = await testClearSubscriptionCredits(clearSubscriptionCreditsFn, updateStatusFn);

      expect(updateStatusFn).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        success: false,
        result: 'UnknownError',
        error: unexpectedError
      });
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'There was an error while clearing subscription credits',
        { error: unexpectedError }
      );
    });

    it('should reject with idempotent operation error when updateStatus fails', async () => {
      const updateStatusError = new Error('Failed to update status');
      const clearSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithZeroCredits);
      const updateStatusFn = vi.fn().mockRejectedValue(updateStatusError);

      await expect(
        testClearSubscriptionCredits(clearSubscriptionCreditsFn, updateStatusFn)
      ).rejects.toThrow(
        'Error while handling deleteCredits. Throwing error so that it gets retried cause the operation is idempotent. Error: Failed to update status'
      );
    });

    it('should update to different status based on parameter', async () => {
      const clearSubscriptionCreditsFn = vi.fn().mockResolvedValue(validUserWithZeroCredits);
      const updateStatusFn = vi.fn().mockResolvedValue(undefined);
      const customStatus = 'suspended' as UserStatus;

      await testClearSubscriptionCredits(
        clearSubscriptionCreditsFn,
        updateStatusFn,
        validUserId,
        customStatus
      );

      expect(updateStatusFn).toHaveBeenCalledWith(validUserId, customStatus);
    });
  });

  describe('incrementDemoReminderCount', () => {
    it('should successfully increment demo reminder count and return success result', async () => {
      const validDemoCountResult = { DemoReminderCount: 1 };
      const incrementDemoReminderCountFn = vi.fn().mockResolvedValue(validDemoCountResult);

      const result = await testIncrementDemoReminderCount(
        incrementDemoReminderCountFn,
        validDemoReminderLimit
      );

      expect(incrementDemoReminderCountFn).toHaveBeenCalledTimes(1);
      expect(incrementDemoReminderCountFn).toHaveBeenCalledWith(
        validUserId,
        validDemoReminderLimit
      );
      expect(result).toStrictEqual({
        success: true,
        result: 'Success',
        demoRemindersCount: 1
      });
    });

    it('should handle demo reminder limit reached error', async () => {
      const limitError = new Error('Demo reminder limit reached');
      const incrementDemoReminderCountFn = vi.fn().mockRejectedValue(limitError);

      const result = await testIncrementDemoReminderCount(
        incrementDemoReminderCountFn,
        validDemoReminderLimit
      );

      expect(result).toStrictEqual({
        success: false,
        result: 'DemoCounterLimitReachedError',
        error: limitError
      });
    });

    it('should handle unexpected errors during demo reminder count increment', async () => {
      const unexpectedError = new Error('Database write failed');
      const incrementDemoReminderCountFn = vi.fn().mockRejectedValue(unexpectedError);

      const result = await testIncrementDemoReminderCount(
        incrementDemoReminderCountFn,
        validDemoReminderLimit
      );

      expect(result).toStrictEqual({
        success: false,
        result: 'UnknownError',
        error: unexpectedError
      });
    });

    it('should work with different demo reminder limits', async () => {
      const validDemoCountResult = { DemoReminderCount: 2 };
      const incrementDemoReminderCountFn = vi.fn().mockResolvedValue(validDemoCountResult);
      const customLimit = 5;

      const result = await testIncrementDemoReminderCount(
        incrementDemoReminderCountFn,
        customLimit
      );

      expect(incrementDemoReminderCountFn).toHaveBeenCalledWith(validUserId, customLimit);
      expect(result).toStrictEqual({
        success: true,
        result: 'Success',
        demoRemindersCount: 2
      });
    });
  });

  function testDeductCredits(
    deductCreditsFn: () => Promise<Required<Pick<UserStoreRecord<unknown>, 'Credits'>>>,
    updateStatusFn: () => Promise<void>,
    credits: number,
    userId: UserId = validUserId
  ): Promise<CreditDeductionResult<'deduct'>> {
    const userStoreMock = {
      deductCredits: deductCreditsFn,
      updateStatus: updateStatusFn
    } as unknown as UserBaseStore<IdpName>;

    const creditsService = new CreditsService(userStoreMock, logger);
    return creditsService.deductCredits(userId, credits);
  }

  function testResetSubscriptionCredits(
    resetSubscriptionCreditsFn: () => Promise<Required<Pick<UserStoreRecord<unknown>, 'Credits'>>>,
    updateStatusFn: () => Promise<void>,
    credits: number,
    userId: UserId = validUserId,
    tierId: TierId = validTierId
  ): Promise<CreditAdditionResult<'reset'>> {
    const userStoreMock = {
      resetSubscriptionCredits: resetSubscriptionCreditsFn,
      updateStatus: updateStatusFn
    } as unknown as UserBaseStore<IdpName>;

    const creditsService = new CreditsService(userStoreMock, logger);
    return creditsService.resetSubscriptionCredits(userId, credits, tierId);
  }

  function testAddCredits(
    addCreditsFn: () => Promise<Required<Pick<UserStoreRecord<unknown>, 'Credits'>>>,
    updateStatusFn: () => Promise<void>,
    credits: number,
    product: { type: 'subscription'; id: TierId } | { type: 'topup'; id: TopupId },
    userId: UserId = validUserId
  ): Promise<CreditAdditionResult<'add'>> {
    const userStoreMock = {
      addCredits: addCreditsFn,
      updateStatus: updateStatusFn
    } as unknown as UserBaseStore<IdpName>;

    const creditsService = new CreditsService(userStoreMock, logger);
    return creditsService.addCredits(userId, credits, product);
  }

  function testClearSubscriptionCredits(
    clearSubscriptionCreditsFn: () => Promise<Required<Pick<UserStoreRecord<unknown>, 'Credits'>>>,
    updateStatusFn: () => Promise<void>,
    userId: UserId = validUserId,
    status: UserStatus = validUserStatus
  ): Promise<CreditDeductionResult<'clear'>> {
    const userStoreMock = {
      clearSubscriptionCredits: clearSubscriptionCreditsFn,
      updateStatus: updateStatusFn
    } as unknown as UserBaseStore<IdpName>;

    const creditsService = new CreditsService(userStoreMock, logger);
    return creditsService.clearSubscriptionCredits(userId, status);
  }

  function testIncrementDemoReminderCount(
    incrementDemoReminderCountFn: () => Promise<{ DemoReminderCount: number }>,
    demoReminderLimit: number,
    userId: UserId = validUserId
  ): Promise<DemoCounterIncrementResult> {
    const userStoreMock = {
      incrementDemoReminderCount: incrementDemoReminderCountFn
    } as unknown as UserBaseStore<IdpName>;

    const creditsService = new CreditsService(userStoreMock, logger);
    return creditsService.incrementDemoReminderCount(userId, demoReminderLimit);
  }
});
