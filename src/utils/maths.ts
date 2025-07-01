import type { Percentage } from '@notifycal/shared/types';

export function calculateRemainingPercentageFromAmounts(
  remainingAmount: number,
  fullAmount: number
): Percentage {
  if (fullAmount <= 0) {
    throw new Error('Full amount must be greater than 0');
  }

  if (remainingAmount < 0 || remainingAmount > fullAmount) {
    throw new Error(
      `Invalid remaining amount: ${remainingAmount}. Must be between 0 and ${fullAmount}`
    );
  }

  const remainingPercentage = (remainingAmount / fullAmount) * 100;
  const factor = 10 ** 5;
  return Math.trunc(remainingPercentage * factor) / factor;
}
