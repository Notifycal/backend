import type { AuditTrailStoreRecord } from '@model/store/AuditTrailStoreRecord';
import { type BaseStoreConfig, BaseStore } from '@services/common/base-store';

export type AuditTrailBaseStoreConfig = BaseStoreConfig;
export type AuditTrailBaseStoreEndpointConfig = {
  auditTrailBaseStoreConfig: AuditTrailBaseStoreConfig;
};

export class AuditTrailBaseStore extends BaseStore<AuditTrailBaseStoreConfig> {
  public static withConfig(config: AuditTrailBaseStoreConfig): AuditTrailBaseStore {
    return new AuditTrailBaseStore(config);
  }

  private constructor(config: AuditTrailBaseStoreConfig) {
    super(config);
  }

  public put(event: AuditTrailStoreRecord): Promise<void> {
    return this.putCommandRunner({ Item: { ...event } }).then(() => {
      return;
    });
  }
}
