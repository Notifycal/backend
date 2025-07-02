import type { TopupId, UserId } from '@notifycal/shared/types';
import { describe, expect, it, vi } from 'vitest';
import type { CreditAdditionResult, CreditsService } from './credits-service';
import { TopupService } from './topup';

describe(TopupService, () => {
  const validUserId = 'user-123' as UserId;
  const validTopupId = 'single' as const;
  const validQuantity = 3;
  const validCreditAdditionResult: CreditAdditionResult = {
    success: true,
    operationId: 'Success',
    subscriptionCreditBalance: 50,
    topupCreditBalance: 30
  };

  const validTopupToCreditsMap: Record<TopupId, number> = {
    single: 90
  };

  it('should calculate credits correctly and call addTopupCredits', async () => {
    const result = await testIt(
      validUserId,
      validTopupId,
      validQuantity,
      vi.fn().mockResolvedValue(validCreditAdditionResult)
    );

    expect(result).toStrictEqual(validCreditAdditionResult);
  });

  it('should handle single quantity topup', async () => {
    const addTopupCreditsFn = vi.fn().mockResolvedValue(validCreditAdditionResult);

    await testIt(validUserId, validTopupId, 1, addTopupCreditsFn);

    expect(addTopupCreditsFn).toHaveBeenCalledTimes(1);
    expect(addTopupCreditsFn).toHaveBeenCalledWith(validUserId, 90, {
      type: 'topup',
      id: 'single'
    });
  });

  it('should handle zero quantity resulting in zero credits', async () => {
    const addTopupCreditsFn = vi.fn();

    const result = testIt(validUserId, validTopupId, 0, addTopupCreditsFn);

    await expect(result).rejects.toThrow(
      `Error while adding a topup. Quantity cannot be smaller than 1. Quantity: 0`
    );
    expect(addTopupCreditsFn).not.toHaveBeenCalled();
  });

  it('should throw an error if negative quantity', async () => {
    const addTopupCreditsFn = vi.fn();
    const result = testIt(validUserId, validTopupId, -3, addTopupCreditsFn);

    await expect(result).rejects.toThrow(
      `Error while adding a topup. Quantity cannot be smaller than 1. Quantity: -3`
    );
    expect(addTopupCreditsFn).not.toHaveBeenCalled();
  });

  it('should propagate errors from creditsService', async () => {
    const errorMessage = 'Credits service unavailable';
    const addTopupCreditsFn = vi.fn().mockRejectedValue(new Error(errorMessage));

    await expect(
      testIt(validUserId, validTopupId, validQuantity, addTopupCreditsFn)
    ).rejects.toThrow(errorMessage);
  });

  function testIt(
    userId: UserId,
    topup: TopupId,
    quantity: number,
    addTopupCreditsFn: () => Promise<CreditAdditionResult>,
    topupToCreditsMap: Record<TopupId, number> = validTopupToCreditsMap
  ): Promise<CreditAdditionResult> {
    const creditsServiceMock = {
      addCredits: addTopupCreditsFn
    } as unknown as CreditsService<'google.com'>;

    const topupService = new TopupService(creditsServiceMock, topupToCreditsMap);

    return topupService.add(userId, topup, quantity);
  }
});
