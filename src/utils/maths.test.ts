import { describe, expect, it } from 'vitest';
import { calculateRemainingPercentageFromAmounts } from './maths';

describe(calculateRemainingPercentageFromAmounts, () => {
  it('should calculate 99.9% remaining when credit is 999 of 1000', () => {
    const result = calculateRemainingPercentageFromAmounts(999, 1000);

    expect(result).toBe(99.9);
  });

  it('should calculate 50% remaining when credit is 1250 of 2500', () => {
    const result = calculateRemainingPercentageFromAmounts(1250, 2500);

    expect(result).toBe(50);
  });

  it('should calculate 100% remaining when credit equals full amount', () => {
    const result = calculateRemainingPercentageFromAmounts(1000, 1000);

    expect(result).toBe(100);
  });

  it('should calculate 0% remaining when credit is 0', () => {
    const result = calculateRemainingPercentageFromAmounts(0, 1000);

    expect(result).toBe(0);
  });

  it('should throw error when full plan amount is 0', () => {
    expect(() => calculateRemainingPercentageFromAmounts(100, 0)).toThrow(
      'Full amount must be greater than 0'
    );
  });

  it('should throw error when credit amount is negative', () => {
    expect(() => calculateRemainingPercentageFromAmounts(-100, 1000)).toThrow(
      'Invalid remaining amount: -100. Must be between 0 and 1000'
    );
  });

  it('should truncate to 5 decimal places', () => {
    const result = calculateRemainingPercentageFromAmounts(333, 1000);

    expect(result).toBe(33.3);
  });
});
