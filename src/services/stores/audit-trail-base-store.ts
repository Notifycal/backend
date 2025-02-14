import type { EventStoreRecord } from '@model/store/EventRecordStore';
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

  public put(event: EventStoreRecord): Promise<void> {
    return this.putCommandRunner({ Item: { ...event } }).then(() => {
      return;
    });
  }
}
