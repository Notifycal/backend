import type { DeadLetterQueueEndpointConfig } from '@model/Config';
import {
  readAuditTrailBaseStoreConfig,
  readDeadLetterQueueConfig,
  readEnv
} from '@services/common/config';
import type { AuditTrailBaseStoreEndpointConfig } from '@services/stores/audit-trail-base-store';

export type AuditTrailConfig = AuditTrailBaseStoreEndpointConfig & DeadLetterQueueEndpointConfig;

export function readAuditTrailConfig(): AuditTrailConfig {
  const env = readEnv();
  return {
    ...readAuditTrailBaseStoreConfig(env),
    ...readDeadLetterQueueConfig(env)
  };
}
