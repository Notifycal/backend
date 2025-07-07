import type {
  Email,
  Identity,
  IdpId,
  IdpName,
  Percentage,
  TierId,
  UserId
} from '@notifycal/shared/types';
import { describe, expect, it, vi } from 'vitest';
import type {
  CreditAdditionResult,
  CreditDeductionResult,
  CreditsService
} from './credits-service';
import type { SnsService } from './sns';
import { SubscriptionService } from './subscription';

describe('SubscriptionService Event Publishing', () => {
  const validUserId = 'user-123' as UserId;
  const validGoodTier = 'good' as TierId;
  const validBetterTier = 'better' as TierId;
  const validIdentity: Identity<IdpName> = {
    userId: validUserId,
    idp: 'google.com',
    idpId: 'google-user-123' as IdpId,
    email: 'test@gmail.com' as Email
  };

  const validTierToCreditsMap: Record<TierId, number> = {
    good: 100,
    better: 500,
    best: 1000
  };

  const validSuccessResult: CreditAdditionResult = {
    success: true,
    operationId: 'Success',
    subscriptionCreditBalance: 150,
    topupCreditBalance: 44
  };

  const validErrorResult: CreditAdditionResult = {
    success: false,
    operationId: 'UnknownError',
    error: new Error('Service unavailable')
  };

  const validSuccessDeduction: CreditDeductionResult = {
    success: true,
    operationId: 'Success',
    subscriptionCreditBalance: 55,
    topupCreditBalance: 4
  };

  const validErrorDeduction: CreditDeductionResult = {
    success: false,
    operationId: 'UnknownError',
    error: new Error('Deduction failed')
  };

  describe('create', () => {
    it('should publish SubscriptionCreated event on success', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ resetSubscriptionCredits: resetFn }, safePublishFn);

      await service.create(validIdentity, validGoodTier);

      expect(safePublishFn).toHaveBeenCalledTimes(1);

      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionCreated',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            tier: validGoodTier,
            result: validSuccessResult
          }
        })
      );
    });

    it('should publish SubscriptionCreationFailed event on service failure', async () => {
      const resetFn = vi.fn().mockResolvedValue(validErrorResult);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ resetSubscriptionCredits: resetFn }, safePublishFn);

      await service.create(validIdentity, validGoodTier);

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionCreationFailed',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            tier: validGoodTier,
            result: validErrorResult,
            error: undefined
          }
        })
      );
    });

    it('should publish SubscriptionCreationFailed event on exception', async () => {
      const error = new Error('Network error');
      const resetFn = vi.fn().mockRejectedValue(error);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ resetSubscriptionCredits: resetFn }, safePublishFn);

      await expect(service.create(validIdentity, validGoodTier)).rejects.toThrow('Network error');

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionCreationFailed',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            tier: validGoodTier,
            result: undefined,
            error: error
          }
        })
      );
    });
  });

  describe('renew', () => {
    it('should publish SubscriptionRenewed event on success', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ resetSubscriptionCredits: resetFn }, safePublishFn);

      await service.renew(validIdentity, validBetterTier);

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionRenewed',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            tier: validBetterTier,
            result: validSuccessResult
          }
        })
      );
    });

    it('should publish SubscriptionRenewalFailed event on service failure', async () => {
      const resetFn = vi.fn().mockResolvedValue(validErrorResult);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ resetSubscriptionCredits: resetFn }, safePublishFn);

      await service.renew(validIdentity, validBetterTier);

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionRenewalFailed',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            tier: validBetterTier,
            result: validErrorResult,
            error: undefined
          }
        })
      );
    });

    it('should publish SubscriptionRenewalFailed event on exception', async () => {
      const error = new Error('Database error');
      const resetFn = vi.fn().mockRejectedValue(error);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ resetSubscriptionCredits: resetFn }, safePublishFn);

      await expect(service.renew(validIdentity, validBetterTier)).rejects.toThrow('Database error');

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionRenewalFailed',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            tier: validBetterTier,
            result: undefined,
            error: error
          }
        })
      );
    });
  });

  describe('upgrade', () => {
    it('should publish SubscriptionUpgraded event on success', async () => {
      const addFn = vi.fn().mockResolvedValue(validSuccessResult);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ addCredits: addFn }, safePublishFn);
      const remainingPercentage = 50 as Percentage;
      const expectedCreditsToAdd = 200;

      await service.upgrade(validIdentity, validGoodTier, validBetterTier, remainingPercentage);

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionUpgraded',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            previousTier: validGoodTier,
            currentTier: validBetterTier,
            remainingPercentage: remainingPercentage,
            creditsAdded: expectedCreditsToAdd,
            result: validSuccessResult
          }
        })
      );
    });

    it('should publish SubscriptionUpgradeFailed event on service failure', async () => {
      const addFn = vi.fn().mockResolvedValue(validErrorResult);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ addCredits: addFn }, safePublishFn);
      const remainingPercentage = 50 as Percentage;
      const expectedCreditsToAdd = 200;

      await service.upgrade(validIdentity, validGoodTier, validBetterTier, remainingPercentage);

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionUpgradeFailed',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            previousTier: validGoodTier,
            currentTier: validBetterTier,
            remainingPercentage: remainingPercentage,
            creditsAdded: expectedCreditsToAdd,
            result: validErrorResult,
            error: undefined
          }
        })
      );
    });

    it('should publish SubscriptionUpgradeFailed event on exception', async () => {
      const error = new Error('Service error');
      const addFn = vi.fn().mockRejectedValue(error);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ addCredits: addFn }, safePublishFn);
      const remainingPercentage = 50 as Percentage;
      const expectedCreditsToAdd = 200;

      await expect(
        service.upgrade(validIdentity, validGoodTier, validBetterTier, remainingPercentage)
      ).rejects.toThrow('Service error');

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionUpgradeFailed',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            previousTier: validGoodTier,
            currentTier: validBetterTier,
            remainingPercentage: remainingPercentage,
            creditsAdded: expectedCreditsToAdd,
            result: undefined,
            error: error
          }
        })
      );
    });

    it('should publish SubscriptionUpgradeFailed event for invalid percentage', async () => {
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({}, safePublishFn);
      const invalidPercentage = -10 as Percentage;

      await service.upgrade(validIdentity, validGoodTier, validBetterTier, invalidPercentage);

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionUpgradeFailed',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            previousTier: validGoodTier,
            currentTier: validBetterTier,
            remainingPercentage: invalidPercentage,
            creditsAdded: 0,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            result: expect.objectContaining({
              success: false,
              operationId: 'UnknownError',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              error: expect.any(Error)
            })
          })
        })
      );
    });

    it('should publish SubscriptionUpgradeFailed event for zero credits', async () => {
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({}, safePublishFn);
      const remainingPercentage = 50 as Percentage;

      await service.upgrade(validIdentity, validGoodTier, validGoodTier, remainingPercentage);

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionUpgradeFailed',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            previousTier: validGoodTier,
            currentTier: validGoodTier,
            remainingPercentage: remainingPercentage,
            creditsAdded: 0,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            result: expect.objectContaining({
              success: false,
              operationId: 'UnknownError',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              error: expect.any(Error)
            })
          })
        })
      );
    });
  });

  describe('cancel', () => {
    it('should publish SubscriptionCancelled event on success', async () => {
      const clearFn = vi.fn().mockResolvedValue(validSuccessDeduction);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ clearSubscriptionCredits: clearFn }, safePublishFn);

      await service.cancel(validIdentity, 'unpaid');

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionCancelled',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            reason: 'unpaid',
            result: validSuccessDeduction
          }
        })
      );
    });

    it('should publish SubscriptionCancellationFailed event on service failure', async () => {
      const clearFn = vi.fn().mockResolvedValue(validErrorDeduction);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ clearSubscriptionCredits: clearFn }, safePublishFn);

      await service.cancel(validIdentity, 'cancelled');

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionCancellationFailed',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            reason: 'cancelled',
            result: validErrorDeduction,
            error: undefined
          }
        })
      );
    });

    it('should publish SubscriptionCancellationFailed event on exception', async () => {
      const error = new Error('Cancellation failed');
      const clearFn = vi.fn().mockRejectedValue(error);
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({ clearSubscriptionCredits: clearFn }, safePublishFn);

      await expect(service.cancel(validIdentity, 'unpaid')).rejects.toThrow('Cancellation failed');

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionCancellationFailed',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {
            reason: 'unpaid',
            result: undefined,
            error: error
          }
        })
      );
    });
  });

  describe('scheduleDowngrade', () => {
    it('should publish SubscriptionDowngradeScheduled event', async () => {
      const safePublishFn = vi.fn().mockResolvedValue(undefined);
      const service = testIt({}, safePublishFn);

      await service.scheduleDowngrade(validIdentity);

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionDowngradeScheduled',
          userId: validUserId,
          idp: 'google.com',
          idpId: 'google-user-123',
          data: {}
        })
      );
    });
  });

  describe('SNS publishing behavior', () => {
    it('should propagate SNS errors but still attempt to publish events', async () => {
      const snsError = new Error('SNS unavailable');
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      const safePublishFn = vi.fn().mockRejectedValue(snsError);
      const service = testIt({ resetSubscriptionCredits: resetFn }, safePublishFn);

      await expect(service.create(validIdentity, validGoodTier)).rejects.toThrow('SNS unavailable');
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionCreated'
        })
      );
    });

    it('should handle SNS errors gracefully in failure scenarios', async () => {
      const snsError = new Error('SNS unavailable');
      const serviceError = new Error('Service error');
      const resetFn = vi.fn().mockRejectedValue(serviceError);
      const safePublishFn = vi.fn().mockRejectedValue(snsError);
      const service = testIt({ resetSubscriptionCredits: resetFn }, safePublishFn);

      await expect(service.create(validIdentity, validGoodTier)).rejects.toThrow('SNS unavailable');
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SubscriptionCreationFailed'
        })
      );
    });
  });

  function testIt(
    creditsServiceFns: Partial<CreditsService<IdpName>>,
    safePublishFn: ReturnType<typeof vi.fn>
  ): SubscriptionService<IdpName> {
    const snsService = { safePublish: safePublishFn } as unknown as SnsService;
    return new SubscriptionService(
      creditsServiceFns as CreditsService<IdpName>,
      validTierToCreditsMap,
      snsService
    );
  }
});
