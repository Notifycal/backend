import { QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import { IndexStore, type IndexStoreConfig } from '@services/common/index-store';

export type UserLiveIndexStoreConfig = IndexStoreConfig;
export type UserLiveIndexStoreEndpointConfig = { userLiveIndexStoreConfig: UserLiveIndexStoreConfig };

export class UserLiveIndexStore extends IndexStore<UserLiveIndexStoreConfig> {
  public static withConfig(
    config: UserLiveIndexStoreConfig
  ): UserLiveIndexStore {
    return new UserLiveIndexStore(config);
  }

  private constructor(config: UserLiveIndexStoreConfig) {
    super(config);
  }

  public getLiveUsers() {
    const queryCommand = {
      KeyConditionExpression: 'UserStatus = :status',
      ExpressionAttributeValues: {
        ':status': 'live'
      }
    };

    return super.queryCommandRunner(queryCommand);
  }
}
