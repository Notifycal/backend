import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import type { IdpName } from '@notifycal/shared/types';
import { IndexStore, type IndexStoreConfig } from '@services/common/index-store';

export type UserLiveIndexStoreConfig = IndexStoreConfig;
export type UserLiveIndexStoreEndpointConfig = {
  userLiveIndexStoreConfig: UserLiveIndexStoreConfig;
};

export class UserLiveIndexStore<
  TIdpName extends IdpName
> extends IndexStore<UserLiveIndexStoreConfig> {
  public static withConfig<TIdpName extends IdpName>(
    config: UserLiveIndexStoreConfig
  ): UserLiveIndexStore<TIdpName> {
    return new UserLiveIndexStore<TIdpName>(config);
  }

  private constructor(config: UserLiveIndexStoreConfig) {
    super(config);
  }

  public getLiveUsers(): AsyncGenerator<
    Array<LiveUserStoreRecord<TIdpName> & UserIdpAuthorizationStoreRecord<TIdpName>>,
    void,
    void
  > {
    const projections: Array<keyof LiveUserStoreRecord<IdpName>> = [
      'UserId',
      'IdpId',
      'Idp',
      'IdpAuthorization',
      'Config',
      'Email'
    ];

    const queryCommand = {
      KeyConditionExpression: 'UserStatus = :status',
      FilterExpression:
        'attribute_exists(Config) AND size(Config) > :configMinSize AND attribute_exists(Config.calendars)',
      ExpressionAttributeValues: {
        ':status': 'live',
        ':configMinSize': 0
      },
      ProjectionExpression: projections.join(', ')
    };

    return super.queryCommandRunner(queryCommand);
  }
}
