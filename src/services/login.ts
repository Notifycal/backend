import type { User } from '@model/User';
import { UserBaseStore, type UserBaseStoreConfig } from './user-base-store';
import type { EncodeAccessJwtConfig, EncodeRefreshJwtConfig } from '@model/Config';
import type { UserId } from '@own-types/model';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { successHandler } from './common/api-response-handlers';
import { type EncodedAndDecodedJwts, buildJwts } from './jwt';
import type { RefreshTokenBaseStore } from './refresh-token-base-store';

function signUpUser(email: string, userProvider: UserBaseStore): Promise<User> {
  const now = Date.now();
  const newUser = {
    UserId: email,
    LastSignInAt: now,
    SignedUpAt: now,
    Banned: false
  };
  return userProvider.putUser(newUser).then(() => newUser);
}

export function signInOrUpUser(email: string, config: UserBaseStoreConfig): Promise<User> {
  const userProvider = new UserBaseStore(config);
  return userProvider.getUserByEmail(email).then(
    (userOrNot) => {
      if (userOrNot) {
        if (!userOrNot.Banned) {
          const updatedUser = {
            ...userOrNot,
            LastSignInAt: Date.now()
          };
          return userProvider.putUser(updatedUser).then(() => updatedUser);
        } else {
          return Promise.reject(
            new Error(`User with id '${email}' is banned and login is prohibited`)
          );
        }
      } else {
        return signUpUser(email, userProvider);
      }
    },
    (error) =>
      Promise.reject(new Error(`User with id '${email}' could not sign in. Error: ${error}`))
  );
}

export function buildJwtsAndStoreRefreshJwt(
  userId: UserId,
  encodeAccessJwtConfig: EncodeAccessJwtConfig,
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig,
  store: RefreshTokenBaseStore
): Promise<EncodedAndDecodedJwts> {
  return buildJwts(userId, encodeAccessJwtConfig, encodeRefreshJwtConfig).then((jwts) =>
    store
      .putToken({
        UserId: jwts.refreshToken.decoded.payload.sub,
        RefreshToken: jwts.refreshToken.encoded,
        RefreshTokenId: jwts.refreshToken.decoded.payload.jti,
        ExpiresAt: jwts.refreshToken.decoded.payload.exp + 1 // +1 just in case...
      })
      .then(() => jwts)
  );
}

export function _successHandler(jwts: EncodedAndDecodedJwts): APIGatewayProxyResult {
  return successHandler()({
    accessToken: jwts.accessToken.encoded,
    tokenType: 'Bearer',
    refreshToken: jwts.refreshToken.encoded
  });
}
