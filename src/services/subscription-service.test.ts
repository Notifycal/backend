/* eslint-disable vitest/expect-expect */
import type { TierId } from '@model/PaymentPlans';
import type { IdpName, Percentage, UnixTimestamp, UserId } from '@notifycal/shared/types';
import type { Period } from '@own-types/model';
import { describe, expect, it, vi } from 'vitest';
import type {
  CreditAdditionResult,
  CreditDeductionResult,
  CreditsService
} from './credits-service';
import { calculateUpgradeCredits, SubscriptionService } from './subscription-service';

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

  const validPeriod: Period = {
    start: 1000,
    end: 2000
  };

  const validTimestampHalfWayThePeriod: UnixTimestamp = 1500 as UnixTimestamp;

  const validSuccessDeduction: CreditDeductionResult = {
    success: true,
    operationId: 'Success',
    subscriptionCreditBalance: 55,
    topupCreditBalance: 4
  };

  describe('createSubscription', () => {
    it('should create subscription for good tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItCreate(resetFn, validUserId, validGoodTier);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 100, validGoodTier);
    });

    it('should create subscription for better tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItCreate(resetFn, validUserId, validBetterTier);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 500, validBetterTier);
    });

    it('should create subscription for best tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      const result = testItCreate(resetFn, validUserId, validBestTier);

      await expect(result).resolves.toStrictEqual(validSuccessResult);
      expect(resetFn).toHaveBeenCalledWith(validUserId, 1000, validBestTier);
    });

    it('should passthrough credits service error result as a success', async () => {
      const resetFn = vi.fn().mockResolvedValue(validErrorResult);
      const result = testItCreate(resetFn, validUserId, validBestTier);

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
      await testItCreate(resetFn, validUserId, validGoodTier, customMap);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 200, validGoodTier);
    });

    function testItCreate(
      resetFn: () => Promise<CreditAdditionResult>,
      userId: UserId = validUserId,
      tier: TierId = validGoodTier,
      map = validTierToCreditsMap
    ): Promise<CreditAdditionResult> {
      const service = new SubscriptionService(
        { resetSubscriptionCredits: resetFn } as unknown as CreditsService<IdpName>,
        map
      );
      return service.create(userId, tier);
    }
  });

  describe('renewSubscription', () => {
    it('should renew subscription for good tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItRenew(resetFn, validUserId, validGoodTier);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 100, validGoodTier);
    });

    it('should renew subscription for better tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItRenew(resetFn, validUserId, validBetterTier);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 500, validBetterTier);
    });

    it('should renew subscription for best tier and add correct credits', async () => {
      const resetFn = vi.fn().mockResolvedValue(validSuccessResult);
      await testItRenew(resetFn, validUserId, validBestTier);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 1000, validBestTier);
    });

    it('should passthough credits service error result as a success', async () => {
      const resetFn = vi.fn().mockResolvedValue(validErrorResult);
      const result = testItRenew(resetFn, validUserId, validBestTier);

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
      await testItRenew(resetFn, validUserId, validBetterTier, customMap);

      expect(resetFn).toHaveBeenCalledWith(validUserId, 600, validBetterTier);
    });

    function testItRenew(
      resetFn: () => Promise<CreditAdditionResult>,
      userId: UserId = validUserId,
      tier: TierId = validGoodTier,
      map = validTierToCreditsMap
    ): Promise<CreditAdditionResult> {
      const service = new SubscriptionService(
        { resetSubscriptionCredits: resetFn } as unknown as CreditsService<IdpName>,
        map
      );
      return service.renew(userId, tier);
    }
  });

  describe('upgrade', () => {
    it('should add proportional credits for upgrade', async () => {
      const addFn = vi.fn().mockResolvedValue(validSuccessResult);
      const result = await testItUpgrade(
        addFn,
        validUserId,
        validGoodTier,
        validBetterTier,
        validPeriod,
        validTimestampHalfWayThePeriod
      );

      expect(addFn).toHaveBeenCalledWith(validUserId, 200, validBetterTier);
      expect(result).toStrictEqual(validSuccessResult);
    });

    it('should throw an error cause now is outside of the period', async () => {
      const addFn = vi.fn().mockResolvedValue(validSuccessResult);
      const result = await testItUpgrade(
        addFn,
        validUserId,
        validGoodTier,
        validBetterTier,
        validPeriod,
        (validPeriod.start - 1) as UnixTimestamp
      );

      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: new Error(
          `There is not bylling cycle remaining. Most likely 'at' was out of boudaries of 'period'. Resulting percentage: 0`
        )
      });

      expect(addFn).not.toHaveBeenCalled();
    });

    it('should return error result from service', async () => {
      const addFn = vi.fn().mockResolvedValue(validErrorResult);
      const result = await testItUpgrade(
        addFn,
        validUserId,
        validGoodTier,
        validBetterTier,
        validPeriod,
        validTimestampHalfWayThePeriod
      );

      expect(result).toStrictEqual(validErrorResult);
    });

    it('should throw if service throws', async () => {
      const addFn = vi.fn().mockRejectedValue(new Error('boom'));

      await expect(() =>
        testItUpgrade(
          addFn,
          validUserId,
          validGoodTier,
          validBetterTier,
          validPeriod,
          validTimestampHalfWayThePeriod
        )
      ).rejects.toThrow('boom');
    });

    it('should return error result if downgrade is attempted in upgrade method', async () => {
      const addFn = vi.fn();
      const result = await testItUpgrade(
        addFn,
        validUserId,
        validBetterTier,
        validGoodTier,
        validPeriod,
        validTimestampHalfWayThePeriod
      );

      expect(result).toStrictEqual({
        success: false,
        operationId: 'UnknownError',
        error: new Error('Inadvertent downgrade while doing an upgrade')
      });

      expect(addFn).not.toHaveBeenCalled();
    });

    function testItUpgrade(
      addFn: () => Promise<CreditAdditionResult>,
      userId: UserId,
      prev: TierId,
      curr: TierId,
      period: Period,
      at: UnixTimestamp
    ): Promise<CreditAdditionResult> {
      const service = new SubscriptionService(
        { addSubscriptionCredits: addFn } as unknown as CreditsService<IdpName>,
        validTierToCreditsMap
      );
      return service.upgrade(userId, prev, curr, period, at);
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
      deleteFn: () => Promise<CreditDeductionResult>,
      reason: 'unpaid' | 'cancelled'
    ): Promise<CreditDeductionResult> {
      const service = new SubscriptionService(
        { clearSubscriptionCredits: deleteFn } as unknown as CreditsService<IdpName>,
        validTierToCreditsMap
      );
      return service.cancel(validUserId, reason);
    }
  });

  describe('downgrade', () => {
    it('should resolve immediately without side effects', async () => {
      await expect(testItDowngrade()).resolves.toBeUndefined();
    });

    function testItDowngrade(): Promise<void> {
      const service = new SubscriptionService({} as CreditsService<IdpName>, validTierToCreditsMap);
      return service.downgrade(validUserId);
    }
  });
});

describe(calculateUpgradeCredits, () => {
  const validTierToCreditsMap: Record<TierId, number> = {
    good: 100,
    better: 350,
    best: 1000
  };

  it('should return 0 if tiers are the same regardless of remaining period', () => {
    expectIt('good', 'good', 100, 0);
    expectIt('better', 'better', 75, 0);
    expectIt('best', 'best', 0, 0);
  });

  it('should return correct credits for partial upgrade (rounded up)', () => {
    expectIt('good', 'better', 50, Math.ceil((350 - 100) * 0.5));
    expectIt('better', 'best', 25, Math.ceil((1000 - 350) * 0.25));
  });

  it('should return full credit difference if 100% of the period remains', () => {
    expectIt('good', 'better', 100, 250);
    expectIt('better', 'best', 100, 650);
  });

  it('should return 0 credits if 0% of the period remains', () => {
    expectIt('good', 'better', 0, 0);
    expectIt('better', 'best', 0, 0);
  });

  it('should return almost all credits if most of the period remains', () => {
    expectIt('good', 'better', 99.99818, 250);
    expectIt('better', 'best', 99.99818, 650);
  });

  it('should return almost no credits if most of the period has gone by', () => {
    expectIt('good', 'better', 0.00003, 1);
    expectIt('better', 'best', 0.00003, 1);
  });

  it('should return negative value if current tier is lower than previous (inadvertent downgrade)', () => {
    expectIt('better', 'good', 100, -250);
    expectIt('best', 'good', 50, -450);
    expectIt('best', 'better', 25, -162);
  });

  function expectIt(
    previous: TierId,
    current: TierId,
    remainingPct: Percentage,
    expected: number
  ): void {
    const result = calculateUpgradeCredits(previous, current, remainingPct, validTierToCreditsMap);

    expect(result).toBe(expected);
  }
});
