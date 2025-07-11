import type { CreditAdditionResult } from '@model/Credits';
import type { Email, Identity, IdpId, TierId, TopupId, UserId } from '@notifycal/shared/types';
import { describe, expect, it, vi } from 'vitest';
import type { CreditsService } from './credits-service';
import type { SnsService } from './sns';
import { TopupService } from './topup';

describe(TopupService, () => {
  const validIdentity: Identity<'google.com'> = {
    idp: 'google.com',
    idpId: 'idp-123' as IdpId,
    userId: 'user-123' as UserId,
    email: 'test@example.com' as Email
  };
  const validTopupId = 'single' as const;
  const validQuantity = 3;
  const validCreditAdditionResult: CreditAdditionResult = {
    success: true,
    result: 'Success',
    operationDetails: {
      fromBalance: 'topup',
      quantity: 270
    },
    balances: {
      subscription: 50,
      topup: 30
    }
  };

  const validTopupToCreditsMap: Record<TopupId, number> = {
    single: 90
  };

  it('should calculate credits correctly and call credit servcice', async () => {
    const addCreditsFn = vi.fn().mockResolvedValue(validCreditAdditionResult);
    const safePublishFn = vi.fn().mockResolvedValue(undefined);
    const result = await testIt(
      validIdentity,
      validTopupId,
      validQuantity,
      addCreditsFn,
      safePublishFn,
      validTopupToCreditsMap
    );

    expect(result).toStrictEqual(validCreditAdditionResult);
    expect(safePublishFn).toHaveBeenCalledTimes(1);
    expect(safePublishFn).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TopupSucceeded',
        userId: validIdentity.userId,
        data: {
          topupId: validTopupId,
          quantity: validQuantity,
          credits: validTopupToCreditsMap[validTopupId] * validQuantity,
          result: validCreditAdditionResult
        }
      })
    );
  });

  it('should handle single quantity topup', async () => {
    const addCreditsFn = vi.fn().mockResolvedValue(validCreditAdditionResult);
    const safePublishFn = vi.fn().mockResolvedValue(undefined);
    await testIt(
      validIdentity,
      validTopupId,
      1,
      addCreditsFn,
      safePublishFn,
      validTopupToCreditsMap
    );

    expect(addCreditsFn).toHaveBeenCalledTimes(1);
    expect(addCreditsFn).toHaveBeenCalledWith(validIdentity.userId, 90, {
      type: 'topup',
      id: 'single'
    });
    expect(safePublishFn).toHaveBeenCalledTimes(1);
    expect(safePublishFn).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TopupSucceeded',
        userId: validIdentity.userId,
        data: {
          topupId: validTopupId,
          quantity: 1,
          credits: validTopupToCreditsMap[validTopupId] * 1,
          result: validCreditAdditionResult
        }
      })
    );
  });

  it('should handle zero quantity resulting in zero credits', async () => {
    const addCreditsFn = vi.fn();
    const safePublishFn = vi.fn().mockResolvedValue(undefined);
    const result = testIt(
      validIdentity,
      validTopupId,
      0,
      addCreditsFn,
      safePublishFn,
      validTopupToCreditsMap
    );
    const error = new Error(
      `Error while adding a topup. Quantity cannot be smaller than 1. Quantity: 0`
    );

    await expect(result).rejects.toThrow(error);
    expect(addCreditsFn).not.toHaveBeenCalled();
    expect(safePublishFn).toHaveBeenCalledTimes(1);
    expect(safePublishFn).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TopupFailed',
        userId: validIdentity.userId,
        data: {
          topupId: validTopupId,
          quantity: 0,
          credits: 0,
          error
        }
      })
    );
  });

  it('should throw an error if negative quantity', async () => {
    const addCreditsFn = vi.fn();
    const safePublishFn = vi.fn().mockResolvedValue(undefined);
    const result = testIt(
      validIdentity,
      validTopupId,
      -3,
      addCreditsFn,
      safePublishFn,
      validTopupToCreditsMap
    );
    const error = new Error(
      `Error while adding a topup. Quantity cannot be smaller than 1. Quantity: -3`
    );

    await expect(result).rejects.toThrow(error);
    expect(addCreditsFn).not.toHaveBeenCalled();
    expect(safePublishFn).toHaveBeenCalledTimes(1);
    expect(safePublishFn).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TopupFailed',
        userId: validIdentity.userId,
        data: {
          topupId: validTopupId,
          quantity: -3,
          error,
          credits: 0
        }
      })
    );
  });

  it('should propagate errors from creditsService', async () => {
    const errorMessage = 'Credits service unavailable';
    const addCreditsFn = vi.fn().mockRejectedValue(new Error(errorMessage));
    const safePublishFn = vi.fn().mockResolvedValue(undefined);

    const result = testIt(
      validIdentity,
      validTopupId,
      validQuantity,
      addCreditsFn,
      safePublishFn,
      validTopupToCreditsMap
    );
    const error = new Error('Credits service unavailable');

    await expect(result).rejects.toThrow(errorMessage);
    expect(safePublishFn).toHaveBeenCalledTimes(1);
    expect(safePublishFn).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TopupFailed',
        userId: validIdentity.userId,
        data: {
          topupId: validTopupId,
          quantity: validQuantity,
          credits: validTopupToCreditsMap[validTopupId] * validQuantity,
          error
        }
      })
    );
  });

  function testIt(
    identity: Identity<'google.com'>,
    topup: TopupId,
    quantity: number,
    addCreditsFn: (
      userId: UserId,
      amount: number,
      product: { type: 'subscription' | 'topup'; id: TierId | TopupId }
    ) => Promise<CreditAdditionResult>,
    safePublishFn: () => Promise<void>,
    topupToCreditsMap: Record<TopupId, number> = validTopupToCreditsMap
  ): Promise<CreditAdditionResult> {
    const creditsServiceMock = {
      addCredits: addCreditsFn
    } as unknown as CreditsService<'google.com'>;
    const snsServiceMock = {
      safePublish: vi.fn().mockImplementation(safePublishFn)
    } as unknown as SnsService;

    const topupService = new TopupService(creditsServiceMock, topupToCreditsMap, snsServiceMock);
    return topupService.add(identity, topup, quantity);
  }
});
