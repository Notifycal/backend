import type { Logger } from '@aws-lambda-powertools/logger';
import type { AlertCounterKeyNames, AlertStoreRecord } from '@model/store/AlertStoreRecord';
import { BaseStore, type BaseStoreConfig } from '@services/common/base-store';
import { throwError } from '@services/common/error-handling';
import { DateTime } from 'luxon';

export type AlertsBaseStoreConfig = BaseStoreConfig;
export type AlertsBaseStoreEndpointConfig = {
  alertsBaseStoreConfig: AlertsBaseStoreConfig;
};

export class AlertsBaseStore extends BaseStore<AlertsBaseStoreConfig> {
  public static withConfig(config: AlertsBaseStoreConfig, logger: Logger): AlertsBaseStore {
    return new AlertsBaseStore(config, logger);
  }

  private constructor(config: AlertsBaseStoreConfig, logger: Logger) {
    super(config, logger);
  }

  public incrementCounter<
    TAlertName extends string = string,
    TAlertDiscriminator extends string = string
  >(
    alertName: TAlertName,
    alertDiscriminator: TAlertDiscriminator,
    alertCounterKeyName: AlertCounterKeyNames
  ): Promise<AlertStoreRecord<TAlertName, TAlertDiscriminator>> {
    return this.updateCommandRunner({
      Key: {
        AlertName: alertName,
        AlertDiscriminator: alertDiscriminator
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
        return output.Attributes as AlertStoreRecord<TAlertName, TAlertDiscriminator>;
      } else {
        throwError('Error incrementing counter', this.logger);
      }
    });
  }
}
