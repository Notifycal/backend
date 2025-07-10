import type { Logger } from '@aws-lambda-powertools/logger';
import type { EmailingSenderConfig } from '@model/Config';
import type { SnsService } from '@services/sns';
import type {
  AuditTrailInsufficientCreditReminderNotSentEvent,
  AuditTrailLowCreditDetectedEvent
} from './schema';

export function recordProcessor(
  _event: AuditTrailLowCreditDetectedEvent | AuditTrailInsufficientCreditReminderNotSentEvent,
  _config: EmailingSenderConfig,
  _snsService: SnsService,
  logger: Logger
): Promise<void> {
  logger.info(`Processing events`);
  return Promise.resolve();
}
