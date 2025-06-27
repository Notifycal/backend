import type { Logger } from '@aws-lambda-powertools/logger';
import type { AuditTrailStoreRecord } from '@model/store/AuditTrailStoreRecord';
import { type BaseStoreConfig, BaseStore } from '@services/common/base-store';

export type AuditTrailBaseStoreConfig = BaseStoreConfig;
export type AuditTrailBaseStoreEndpointConfig = {
  auditTrailBaseStoreConfig: AuditTrailBaseStoreConfig;
};

export class AuditTrailBaseStore extends BaseStore<AuditTrailBaseStoreConfig> {
  public static withConfig(config: AuditTrailBaseStoreConfig, logger: Logger): AuditTrailBaseStore {
    return new AuditTrailBaseStore(config, logger);
  }

  private constructor(config: AuditTrailBaseStoreConfig, logger: Logger) {
    super(config, logger);
  }

  public put(event: AuditTrailStoreRecord): Promise<void> {
    return this.putCommandRunner({ Item: { ...event } }).then(() => {
      return;
    });
  }
}
