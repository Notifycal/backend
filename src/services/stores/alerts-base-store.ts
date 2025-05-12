import type { AlertCounterKeyNames, AlertStoreRecord } from '@model/store/AlertStoreRecord';
import { BaseStore, type BaseStoreConfig } from '@services/common/base-store';
import { throwError } from '@services/common/error-handling';
import { DateTime } from 'luxon';

export type AlertsBaseStoreConfig = BaseStoreConfig;
export type AlertsBaseStoreEndpointConfig = {
  alertsBaseStoreConfig: AlertsBaseStoreConfig;
};

export class AlertsBaseStore extends BaseStore<AlertsBaseStoreConfig> {
  public static withConfig(config: AlertsBaseStoreConfig): AlertsBaseStore {
    return new AlertsBaseStore(config);
  }

  private constructor(config: AlertsBaseStoreConfig) {
    super(config);
  }

  public incrementCounter<THashKey extends string = string, TSortKey extends string = string>(
    hashKey: THashKey,
    sortKey: TSortKey,
    alertCounterKeyName: AlertCounterKeyNames
  ): Promise<AlertStoreRecord<THashKey, TSortKey>> {
    return this.updateCommandRunner({
      Key: {
        HashKey: hashKey,
        SortKey: sortKey
      },
      UpdateExpression:
        'SET #counter = if_not_exists(#counter, :zero) + :increment, #ttl = if_not_exists(#ttl, :ttl)',
      ExpressionAttributeNames: {
        '#counter': alertCounterKeyName,
        '#ttl': 'ExpiresAt'
      },
      ExpressionAttributeValues: {
        ':increment': 1,
        ':zero': 0,
        ':ttl': DateTime.now().plus({ day: 1 }).toUnixInteger()
      }
    }).then((output) => {
      if (output.Attributes) {
        return output.Attributes as AlertStoreRecord<THashKey, TSortKey>;
      } else {
        throwError('Error incrementing counter');
      }
    });
  }
}
