import type { RefreshTokenStoreRecord } from '@model/store/RefreshTokenStoreRecord';
import type { UserId, Uuid } from '@notifycal/shared/types';
import { BaseStore, type BaseStoreConfig } from '../common/base-store';

export type RefreshTokenBaseStoreConfig = BaseStoreConfig;
export type RefreshTokenBaseStoreConfigEndpointConfig = {
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
};

export class RefreshTokenBaseStore extends BaseStore<RefreshTokenBaseStoreConfig> {
  public constructor(config: RefreshTokenBaseStoreConfig) {
    super(config);
  }

  public getTokenBy(userId: UserId, jwtId: Uuid): Promise<RefreshTokenStoreRecord | undefined> {
    return this.getCommandRunner<RefreshTokenStoreRecord>({
      Key: {
        UserId: userId,
        RefreshTokenId: jwtId
      }
    }).catch((error) =>
      Promise.reject(
        new Error(
          `Tokens stored for user '${userId}' with token id '${jwtId}' could not be retrieved. Error: ${error}`
        )
      )
    );
  }

  public putToken(refreshToken: RefreshTokenStoreRecord): Promise<null> {
    return this.putCommandRunner({
      Item: refreshToken
    });
  }
}
