import { readAuditTrailBaseStoreConfig, readEnv } from '@services/common/config';
import type { AuditTrailBaseStoreEndpointConfig } from '@services/stores/audit-trail-base-store';

export type AuditTrailConfig = AuditTrailBaseStoreEndpointConfig;

export function readAuditTrailConfig(): AuditTrailConfig {
  const env = readEnv();
  return {
    ...readAuditTrailBaseStoreConfig(env)
  };
}
