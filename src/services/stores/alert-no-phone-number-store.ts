import { logger } from '@common/powertools';
import type {
  AlertCounterKeyNames,
  AlertNoPhoneNumberStoreRecord
} from '@model/store/AlertNoPhoneNumberStoreRecord';
import { BaseStore, type BaseStoreConfig } from '@services/common/base-store';
import { throwError } from '@services/common/error-handling';
import { tap } from '@utils/promises';
import { DateTime } from 'luxon';

export type AlertNoPhoneNumberBaseStoreConfig = BaseStoreConfig;
export type AlertNoPhoneNumberBaseStoreEndpointConfig = {
  alertNoPhoneNumberBaseStoreConfig: AlertNoPhoneNumberBaseStoreConfig;
};

export class AlertNoPhoneNumberBaseStore extends BaseStore<AlertNoPhoneNumberBaseStoreConfig> {
  public static withConfig(config: AlertNoPhoneNumberBaseStoreConfig): AlertNoPhoneNumberBaseStore {
    return new AlertNoPhoneNumberBaseStore(config);
  }

  private constructor(config: AlertNoPhoneNumberBaseStoreConfig) {
    super(config);
  }

  public incrementCounter<THashKey extends string = string, TSortKey extends string = string>(
    hashKey: THashKey,
    sortKey: TSortKey,
    alertCounterKeyName: AlertCounterKeyNames
  ): Promise<AlertNoPhoneNumberStoreRecord<THashKey, TSortKey>> {
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
    })
      .then(
        tap((output) => {
          logger.info('increment counter output', { output });
        })
      )
      .then((output) => {
        if (output.Attributes) {
          return output.Attributes as AlertNoPhoneNumberStoreRecord<THashKey, TSortKey>;
        } else {
          throwError('Error incrementing counter');
        }
      });
  }
}
