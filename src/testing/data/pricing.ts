import type { PaymentPlansConfig } from '@model/Config';

export const validPaymentPlans: PaymentPlansConfig = {
  tiers: {
    good: {
      type: 'tier',
      id: 'good',
      priceId: 'price_123456789',
      credits: 100
    },
    better: {
      type: 'tier',
      id: 'better',
      priceId: 'price_123456999',
      credits: 350
    },
    best: {
      type: 'tier',
      id: 'best',
      priceId: 'price_999456789',
      credits: 1000
    }
  },
  topups: {
    single: {
      type: 'topup',
      id: 'single',
      priceId: 'price_999456111',
      credits: 90
    }
  }
};
