import type { User } from '@model/User';
import { UserBaseStore, type UserBaseStoreConfig } from './user-base-store';
import type { EncodeAccessJwtConfig, EncodeRefreshJwtConfig } from '@model/Config';
import type { UnixTimestamp, UserId } from '@own-types/model';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { successHandler } from './common/api-response-handlers';
import { type EncodedAndDecodedJwts, buildJwts } from './jwt';
import type { RefreshTokenBaseStore } from './refresh-token-base-store';
import type { Identity } from '@model/Identity';

function signUpUser(identity: Identity, userProvider: UserBaseStore): Promise<User> {
  const now = Date.now() as UnixTimestamp;
  const newUser: User = {
    UserId: identity.id,
    Email: identity.email,
    Idp: identity.idp,
    IdpId: identity.idpId,
    LastSignInAt: now,
    SignedUpAt: now,
    Status: 'onboarding'
  };
  return userProvider.putUser(newUser).then(() => newUser);
}

export function signInOrUpUser<TIdentity extends Identity>(
  identity: TIdentity,
  config: UserBaseStoreConfig
): Promise<User> {
  const userProvider = new UserBaseStore(config);
  return userProvider.getUserById(identity.id).then(
    (userOrNot) => {
      if (userOrNot) {
        if (userOrNot.Status !== 'banned') {
          const updatedUser = {
            ...userOrNot,
            LastSignInAt: Date.now() as UnixTimestamp
          };
          return userProvider.putUser(updatedUser).then(() => updatedUser);
        } else {
          return Promise.reject(
            new Error(`User with id '${identity.id}' is banned and login is prohibited`)
          );
        }
      } else {
        return signUpUser(identity, userProvider);
      }
    },
    (error) =>
      Promise.reject(new Error(`User with id '${identity.id}' could not sign in. Error: ${error}`))
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
        ExpiresAt: (jwts.refreshToken.decoded.payload.exp + 1) as UnixTimestamp // +1 just in case...
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
