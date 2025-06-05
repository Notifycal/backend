import { logger } from '@common/powertools';
import type { StripeWebhookConfig } from './config';
import type { Record } from './schema';

export function recordProcessor(record: Record, config: StripeWebhookConfig): Promise<void> {
  const detail = record.body.detail as { id?: string } | undefined;
  logger.info('Processed!', { stripeEventId: detail?.id ?? 'unknown', config });
  return Promise.resolve();
}
