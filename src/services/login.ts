import type { UserStoreRecord } from '@model/UserStoreRecord';
import { UserBaseStore, type UserBaseStoreConfig } from './user-base-store';
import type { EncodeAccessJwtConfig, EncodeRefreshJwtConfig } from '@model/Config';
import type { UnixTimestamp } from '@own-types/model';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { successHandler } from './common/api-response-handlers';
import { type EncodedAndDecodedJwts, buildJwts } from './jwt';
import type { RefreshTokenBaseStore } from './refresh-token-base-store';
import type { Identity, IdpName } from '@model/Identity';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';

function signUpUser<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  authorization: AuthorizationForIdp<TIdpName>,
  userProvider: UserBaseStore<TIdpName>
): Promise<UserStoreRecord<TIdpName>> {
  const now = Date.now() as UnixTimestamp;
  const newUser: UserStoreRecord<TIdpName> = {
    UserId: identity.userId,
    Email: identity.email,
    Idp: identity.idp,
    IdpId: identity.idpId,
    LastSignInAt: now,
    SignedUpAt: now,
    Status: 'onboarding'
  };
  return userProvider.putUser(newUser, authorization).then(() => newUser);
}

export function signInOrUpUser<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  authorization: AuthorizationForIdp<TIdpName>,
  config: UserBaseStoreConfig
): Promise<UserStoreRecord<IdpName>> {
  const userProvider = new UserBaseStore<IdpName>(config);
  return userProvider.getUserById(identity.userId).then(
    (userOrNot) => {
      if (userOrNot) {
        if (userOrNot.Status !== 'banned') {
          const updatedUser = {
            ...userOrNot,
            LastSignInAt: Date.now() as UnixTimestamp
          };
          return userProvider.putUser(updatedUser, authorization).then(() => updatedUser);
        } else {
          return Promise.reject(
            new Error(`User with id '${identity.userId}' is banned and login is prohibited`)
          );
        }
      } else {
        return signUpUser(identity, authorization, userProvider);
      }
    },
    (error) =>
      Promise.reject(
        new Error(`User with id '${identity.userId}' could not sign in. Error: ${error}`)
      )
  );
}

export function buildJwtsAndStoreRefreshJwt<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  encodeAccessJwtConfig: EncodeAccessJwtConfig,
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig,
  store: RefreshTokenBaseStore
): Promise<EncodedAndDecodedJwts> {
  return buildJwts(identity, encodeAccessJwtConfig, encodeRefreshJwtConfig).then((jwts) =>
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
