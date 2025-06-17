import type { TierId } from '@model/PaymentPlans';
import type { IdpName, UserId } from '@notifycal/shared/types';
import { describe, expect, it, vi } from 'vitest';
import type { CreditAdditionResult, CreditsService } from './credits-service';
import { SubscriptionService } from './subscription-service';

describe(SubscriptionService, () => {
  const validUserId = 'user-123' as UserId;
  const validGoodTier = 'good' as TierId;
  const validBetterTier = 'better' as TierId;
  const validBestTier = 'best' as TierId;

  const validTierToCreditsMap: Record<TierId, number> = {
    good: 100,
    better: 500,
    best: 1000
  };

  const validSuccessResult = {
    success: true,
    operationId: 'Success',
    subscriptionCreditBalance: 150
  };

  const validErrorResult = {
    success: false,
    operationId: 'UnknownError',
    error: new Error('Service unavailable')
  };

  describe('createSubscription', () => {
    it('should create subscription for good tier and add correct credits', async () => {
      const addCreditsFn = vi.fn().mockResolvedValue(validSuccessResult);

      await testCreateSubscription(addCreditsFn, validUserId, validGoodTier);

      expect(addCreditsFn).toHaveBeenCalledTimes(1);
      expect(addCreditsFn).toHaveBeenCalledWith(validUserId, 100);
    });

    it('should create subscription for better tier and add correct credits', async () => {
      const addCreditsFn = vi.fn().mockResolvedValue(validSuccessResult);

      await testCreateSubscription(addCreditsFn, validUserId, validBetterTier);

      expect(addCreditsFn).toHaveBeenCalledWith(validUserId, 500);
    });

    it('should create subscription for best tier and add correct credits', async () => {
      const addCreditsFn = vi.fn().mockResolvedValue(validSuccessResult);

      const result = testCreateSubscription(addCreditsFn, validUserId, validBestTier);

      await expect(result).resolves.toBeUndefined();
      expect(addCreditsFn).toHaveBeenCalledWith(validUserId, 1000);
    });

    it('should passthrough credits service error result as a success', async () => {
      const addCreditsFn = vi.fn().mockResolvedValue(validErrorResult);

      const result = testCreateSubscription(addCreditsFn, validUserId, validBestTier);

      await expect(result).resolves.toBeUndefined();
    });

    it('should passthrough credits service rejection', async () => {
      const addCreditsFn = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(testCreateSubscription(addCreditsFn)).rejects.toThrow('Network error');
    });

    it('should use custom tier to credits mapping', async () => {
      const customTierToCreditsMap: Record<TierId, number> = {
        good: 200,
        better: 750,
        best: 1500
      };
      const addCreditsFn = vi.fn().mockResolvedValue(validSuccessResult);

      await testCreateSubscription(
        addCreditsFn,
        validUserId,
        validGoodTier,
        customTierToCreditsMap
      );

      expect(addCreditsFn).toHaveBeenCalledWith(validUserId, 200);
    });

    function testCreateSubscription(
      addCreditsFn: () => Promise<CreditAdditionResult>,
      userId: UserId = validUserId,
      tier: TierId = validGoodTier,
      tierToCreditsMap = validTierToCreditsMap
    ): Promise<void> {
      const creditsServiceMock = {
        addCredits: addCreditsFn
      } as unknown as CreditsService<IdpName>;

      const subscriptionService = new SubscriptionService(creditsServiceMock, tierToCreditsMap);
      return subscriptionService.createSubscription(userId, tier);
    }
  });

  describe('renewSubscription', () => {
    it('should renew subscription for good tier and add correct credits', async () => {
      const addCreditsFn = vi.fn().mockResolvedValue(validSuccessResult);

      await testRenewSubscription(addCreditsFn, validUserId, validGoodTier);

      expect(addCreditsFn).toHaveBeenCalledTimes(1);
      expect(addCreditsFn).toHaveBeenCalledWith(validUserId, 100);
    });

    it('should renew subscription for better tier and add correct credits', async () => {
      const addCreditsFn = vi.fn().mockResolvedValue(validSuccessResult);

      await testRenewSubscription(addCreditsFn, validUserId, validBetterTier);

      expect(addCreditsFn).toHaveBeenCalledWith(validUserId, 500);
    });

    it('should renew subscription for best tier and add correct credits', async () => {
      const addCreditsFn = vi.fn().mockResolvedValue(validSuccessResult);

      await testRenewSubscription(addCreditsFn, validUserId, validBestTier);

      expect(addCreditsFn).toHaveBeenCalledWith(validUserId, 1000);
    });

    it('should handle credits service error result as a success', async () => {
      const addCreditsFn = vi.fn().mockResolvedValue(validErrorResult);

      const result = testRenewSubscription(addCreditsFn, validUserId, validBestTier);

      await expect(result).resolves.toBeUndefined();
    });

    it('should handle credits service rejection', async () => {
      const addCreditsFn = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(testRenewSubscription(addCreditsFn)).rejects.toThrow('Database error');
    });

    it('should use custom tier to credits mapping for renewal', async () => {
      const customTierToCreditsMap: Record<TierId, number> = {
        good: 150,
        better: 600,
        best: 1200
      };
      const addCreditsFn = vi.fn().mockResolvedValue(validSuccessResult);

      await testRenewSubscription(
        addCreditsFn,
        validUserId,
        validBetterTier,
        customTierToCreditsMap
      );

      expect(addCreditsFn).toHaveBeenCalledWith(validUserId, 600);
    });

    function testRenewSubscription(
      addCreditsFn: () => Promise<CreditAdditionResult>,
      userId: UserId = validUserId,
      tier: TierId = validGoodTier,
      tierToCreditsMap = validTierToCreditsMap
    ): Promise<void> {
      const creditsServiceMock = {
        addCredits: addCreditsFn
      } as unknown as CreditsService<IdpName>;

      const subscriptionService = new SubscriptionService(creditsServiceMock, tierToCreditsMap);
      return subscriptionService.renewSubscription(userId, tier);
    }
  });
});
