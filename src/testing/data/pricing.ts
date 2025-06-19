import type { PaymentPlansConfig } from '@model/Config';

export const validPaymentPlans: PaymentPlansConfig = {
  tiers: {
    good: {
      id: 'good',
      priceId: 'price_123456789',
      credits: 100
    },
    better: {
      id: 'better',
      priceId: 'price_123456999',
      credits: 350
    },
    best: {
      id: 'best',
      priceId: 'price_999456789',
      credits: 1000
    }
  }
};
