import { readAuditTrailBaseStoreConfig, readEnv } from '@services/common/config';
import type { AuditTrailBaseStoreEndpointConfig } from '@services/stores/audit-trail-base-store';
import { promiseTry } from '@utils/promises';

export type AuditTrailConfig = AuditTrailBaseStoreEndpointConfig;

export function readAuditTrailConfig(): Promise<AuditTrailConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuditTrailBaseStoreConfig(env)
  }));
}
