import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
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
    Array<UserStoreRecord<TIdpName> & AuthorizationForIdp<TIdpName>>,
    void,
    void
  > {
    const queryCommand = {
      KeyConditionExpression: 'UserStatus = :status',
      ExpressionAttributeValues: {
        ':status': 'live'
      }
    };

    return super.queryCommandRunner(queryCommand);
  }
}
