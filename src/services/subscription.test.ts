/* eslint-disable vitest/expect-expect */
import { logger } from '@common/powertools';
import type { CreditAdditionResult, CreditDeductionResult } from '@model/Credits';
import type {
  Email,
  IdpId,
  IdpName,
  Percentage,
  TierId,
  UserId,
  UserIdentity
} from '@notifycal/shared/types';
import { describe, expect, it, vi } from 'vitest';
import type { CreditsService } from './credits-service';
import type { SnsService } from './sns';
import { calculateUpgradeCredits, SubscriptionService } from './subscription';

describe(SubscriptionService, () => {
  const validUserId = 'user-123' as UserId;
  const validGoodTier = 'good' as TierId;
  const validBetterTier = 'better' as TierId;
  const validBestTier = 'best' as TierId;
  const validIdentity: UserIdentity<IdpName> = {
    userId: validUserId,
    idp: 'google.com',
    idpId: 'google-user-123' as IdpId,
    email: 'test@gmail.com' as Email
  };

  const validTierToCreditsMap: Record<TierId, number> = {
    good: 100,
    better: 350,
    best: 1000
  };

  const validSuccessResult: CreditAdditionResult<'reset'> = {
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
  };

  const validErrorResult: CreditAdditionResult<'add'> = {
    success: false,
    result: 'UnknownError',
    error: new Error('Service unavailable')
  };

  const validSuccessDeduction: CreditDeductionResult<'clear'> = {
    success: true,
    result: 'Success',
    operationDetails: {
      fromBalance: 'subscription',
      type: 'clear'
    },
    balances: {
      subscription: 55,
      topup: 4
    }
  };

  describe('createSubscription', () => {
    it('should create subscription for good tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItCreate(resetFn, validIdentity, validGoodTier);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 100, validGoodTier);
    });

    it('should create subscription for better tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItCreate(resetFn, validIdentity, validBetterTier);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 350, validBetterTier);
    });

    it('should create subscription for best tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      const result = testItCreate(resetFn, validIdentity, validBestTier);

      await expect(result).resolves.toStrictEqual(validSuccessResult);
      expect(resetFn).toHaveBeenCalledWith(validUserId, 1000, validBestTier);
    });

    it('should passthrough credits service error result as a success', async () => {
      const resetFn = vi.fn().mockResolvedValue(validErrorResult);
      const result = testItCreate(resetFn, validIdentity, validBestTier);

      await expect(result).resolves.toStrictEqual(validErrorResult);
    });

    it('should passthrough credits service rejection', async () => {
      const resetFn = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(testItCreate(resetFn)).rejects.toThrow('Network error');
    });

    it('should use custom tier to credits mapping', async () => {
      const customMap: Record<TierId, number> = {
        good: 200,
        better: 750,
        best: 1500
      };
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItCreate(resetFn, validIdentity, validGoodTier, customMap);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 200, validGoodTier);
    });

    function testItCreate(
      resetFn: () => Promise<CreditAdditionResult<'reset'>>,
      userIdentity: UserIdentity<IdpName> = validIdentity,
      tier: TierId = validGoodTier,
      map = validTierToCreditsMap
    ): Promise<CreditAdditionResult<'reset'>> {
      const mockSnsService = {
        safePublish: vi.fn(() => Promise.resolve())
      } as unknown as SnsService;
      const service = new SubscriptionService(
        { resetSubscriptionCredits: resetFn } as unknown as CreditsService<IdpName>,
        map,
        mockSnsService,
        logger
      );
      return service.create(userIdentity, tier);
    }
  });

  describe('renewSubscription', () => {
    it('should renew subscription for good tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItRenew(resetFn, validIdentity, validGoodTier);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 100, validGoodTier);
    });

    it('should renew subscription for better tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItRenew(resetFn, validIdentity, validBetterTier);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 350, validBetterTier);
    });

    it('should renew subscription for best tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItRenew(resetFn, validIdentity, validBestTier);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 1000, validBestTier);
    });

    it('should passthough credits service error result as a success', async () => {
      const resetFn = vi.fn().mockResolvedValue(validErrorResult);
      const result = testItRenew(resetFn, validIdentity, validBestTier);

      await expect(result).resolves.toStrictEqual(validErrorResult);
    });

    it('should passthrough credits service rejection', async () => {
      const resetFn = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(testItRenew(resetFn)).rejects.toThrow('Database error');
    });

    it('should use custom tier to credits mapping for renewal', async () => {
      const customMap: Record<TierId, number> = {
        good: 150,
        better: 600,
        best: 1200
      };
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItRenew(resetFn, validIdentity, validBetterTier, customMap);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 600, validBetterTier);
    });

    function testItRenew(
      resetFn: () => Promise<CreditAdditionResult<'reset'>>,
      userIdentity: UserIdentity<IdpName> = validIdentity,
      tier: TierId = validGoodTier,
      map = validTierToCreditsMap
    ): Promise<CreditAdditionResult<'reset'>> {
      const mockSnsService = {
        safePublish: vi.fn(() => Promise.resolve())
      } as unknown as SnsService;
      const service = new SubscriptionService(
        { resetSubscriptionCredits: resetFn } as unknown as CreditsService<IdpName>,
        map,
        mockSnsService,
        logger
      );
      return service.renew(userIdentity, tier);
    }
  });

  describe('upgrade', () => {
    it('should add proportional credits for upgrade', async () => {
      const addFn = vi.fn().mockResolvedValue(validSuccessResult);
      const result = await testItUpgrade(
        addFn,
        validIdentity,
        validGoodTier,
        validBetterTier,
        50 as Percentage
      );

      expect(addFn).toHaveBeenCalledWith(validUserId, 175, {
        type: 'subscription',
        id: validBetterTier
      });
      expect(result).toStrictEqual(validSuccessResult);
    });

    it('should return error for negative remaining percentage', async () => {
      const addFn = vi.fn();
      const result = await testItUpgrade(
        addFn,
        validIdentity,
        validGoodTier,
        validBetterTier,
        -10 as Percentage
      );

      expect(result).toStrictEqual({
        success: false,
        result: 'UnknownError',
        error: new Error('Invalid remaining percentage: -10')
      });
      expect(addFn).not.toHaveBeenCalled();
    });

    it('should return error for remaining percentage over 100', async () => {
      const addFn = vi.fn();
      const result = await testItUpgrade(
        addFn,
        validIdentity,
        validGoodTier,
        validBetterTier,
        150 as Percentage
      );

      expect(result).toStrictEqual({
        success: false,
        result: 'UnknownError',
        error: new Error('Invalid remaining percentage: 150')
      });
      expect(addFn).not.toHaveBeenCalled();
    });

    it('should return error when credits to add is zero', async () => {
      const addFn = vi.fn();
      const result = await testItUpgrade(
        addFn,
        validIdentity,
        validGoodTier,
        validGoodTier,
        0 as Percentage
      );

      expect(result).toStrictEqual({
        success: false,
        result: 'UnknownError',
        error: new Error('Inadvertent credit stealing while doing an upgrade')
      });
      expect(addFn).not.toHaveBeenCalled();
    });

    it('should return error result from service', async () => {
      const addFn = vi.fn().mockResolvedValue(validErrorResult);
      const result = await testItUpgrade(
        addFn,
        validIdentity,
        validGoodTier,
        validBetterTier,
        50 as Percentage
      );

      expect(result).toStrictEqual(validErrorResult);
    });

    it('should throw if service throws', async () => {
      const addFn = vi.fn().mockRejectedValue(new Error('boom'));

      await expect(() =>
        testItUpgrade(addFn, validIdentity, validGoodTier, validBetterTier, 50 as Percentage)
      ).rejects.toThrow('boom');
    });

    function testItUpgrade(
      addFn: () => Promise<CreditAdditionResult<'add'>>,
      userIdentity: UserIdentity<IdpName>,
      prev: TierId,
      curr: TierId,
      currentPlanPaidPercentage: Percentage
    ): Promise<CreditAdditionResult<'add'>> {
      const mockSnsService = {
        safePublish: vi.fn(() => Promise.resolve())
      } as unknown as SnsService;
      const service = new SubscriptionService(
        { addCredits: addFn } as unknown as CreditsService<IdpName>,
        validTierToCreditsMap,
        mockSnsService,
        logger
      );
      return service.upgrade(userIdentity, prev, curr, currentPlanPaidPercentage);
    }
  });

  describe('cancel', () => {
    it('should call cancel with reason unpaid', async () => {
      const deleteFn = vi.fn().mockResolvedValue(validSuccessDeduction);
      const result = await testItCancel(deleteFn, 'unpaid');

      expect(deleteFn).toHaveBeenCalledWith(validUserId, 'unpaid');
      expect(result).toStrictEqual(validSuccessDeduction);
    });

    it('should call cancel with reason cancelled', async () => {
      const deleteFn = vi.fn().mockResolvedValue(validSuccessDeduction);
      const result = await testItCancel(deleteFn, 'cancelled');

      expect(deleteFn).toHaveBeenCalledWith(validUserId, 'cancelled');
      expect(result).toStrictEqual(validSuccessDeduction);
    });

    it('should throw if credits service throws', async () => {
      const deleteFn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(() => testItCancel(deleteFn, 'unpaid')).rejects.toThrow('fail');
    });

    function testItCancel(
      clearFn: () => Promise<CreditDeductionResult<'clear'>>,
      reason: 'unpaid' | 'cancelled'
    ): Promise<CreditDeductionResult<'clear'>> {
      const mockSnsService = {
        safePublish: vi.fn(() => Promise.resolve())
      } as unknown as SnsService;
      const service = new SubscriptionService(
        { clearSubscriptionCredits: clearFn } as unknown as CreditsService<IdpName>,
        validTierToCreditsMap,
        mockSnsService,
        logger
      );
      return service.cancel(validIdentity, reason);
    }
  });

  describe('scheduleDowngrade', () => {
    it('should publish an event indicating a downgrade has been scheduled for next moth with correct tier information', async () => {
      const validTiers = { current: validBestTier, next: validGoodTier };
      const safePublishFn = vi.fn(() => Promise.resolve());

      await expect(testItScheduleDowngrade(validTiers, safePublishFn)).resolves.toBeUndefined();

      expect(safePublishFn).toHaveBeenCalledTimes(1);
      expect(safePublishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            tiers: validTiers
          }
        })
      );
    });

    function testItScheduleDowngrade(
      tiers = { current: validGoodTier, next: validBetterTier },
      safePublishFn = vi.fn(() => Promise.resolve())
    ): Promise<void> {
      const mockSnsService = { safePublish: safePublishFn } as unknown as SnsService;
      const service = new SubscriptionService(
        {} as CreditsService<IdpName>,
        validTierToCreditsMap,
        mockSnsService,
        logger
      );
      return service.scheduleDowngrade(validIdentity, tiers);
    }
  });
});

describe(calculateUpgradeCredits, () => {
  const validTierToCreditsMap: Record<TierId, number> = {
    good: 100,
    better: 350,
    best: 1000
  };

  it('should return full tier credits if 100% of the period is paid', () => {
    expectIt('good', 100, 100);
    expectIt('better', 100, 350);
    expectIt('best', 100, 1000);
  });

  it('should return partial tier credits based on paid percentage (rounded up)', () => {
    expectIt('good', 50, 50);
    expectIt('better', 25, 88);
    expectIt('best', 75, 750);
  });

  it('should return 0 credits if 0% of the period is paid', () => {
    expectIt('good', 0, 0);
    expectIt('better', 0, 0);
    expectIt('best', 0, 0);
  });

  it('should return almost all credits if almost 100% is paid', () => {
    expectIt('good', 99.99818, 100);
    expectIt('better', 99.99818, 350);
    expectIt('best', 99.99818, 1000);
  });

  it('should return minimal credits (rounded up) if very small percentage is paid', () => {
    expectIt('good', 0.00003, 1);
    expectIt('better', 0.00003, 1);
    expectIt('best', 0.00003, 1);
  });

  function expectIt(
    current: TierId,
    currentPlanPaidPercentage: Percentage,
    expected: number
  ): void {
    const result = calculateUpgradeCredits(
      current,
      currentPlanPaidPercentage,
      validTierToCreditsMap
    );

    expect(result).toBe(expected);
  }
});
