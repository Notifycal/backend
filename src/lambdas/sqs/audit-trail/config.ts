import {
  readAuditTrailBaseStoreConfig,
  readAuditTrailRecordExpiresAtConfig,
  readEnv
} from '@services/common/config';
import type { AuditTrailBaseStoreEndpointConfig } from '@services/stores/audit-trail-base-store';

export interface AuditTrailRecordExpiresAtConfig {
  expiresAtInDays: number;
}
export interface AuditTrailRecordExpiresAtEndpointConfig {
  recordExpiresAtConfig: AuditTrailRecordExpiresAtConfig;
}

export type AuditTrailConfig = AuditTrailBaseStoreEndpointConfig &
  AuditTrailRecordExpiresAtEndpointConfig;

export function readAuditTrailConfig(): AuditTrailConfig {
  const env = readEnv();
  return {
    ...readAuditTrailBaseStoreConfig(env),
    ...readAuditTrailRecordExpiresAtConfig(env)
  };
}
