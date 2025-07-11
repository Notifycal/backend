import type { Logger } from '@aws-lambda-powertools/logger';
import type { BaseLoginConfig } from '@lambdas/api/post-login/config';
import { userSignedIn } from '@model/app-events/UserSignedInEvent';
import { userSignedUp } from '@model/app-events/UserSignedUpEvent';
import { userSignInFailed } from '@model/app-events/UserSignInFailedEvent';
import { userSignUpFailed } from '@model/app-events/UserSignUpFailedEvent';
import type {
  ApiRestTopicConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import { type UserIdentityStoreRecord, extractUserIdentity } from '@model/UserIdentity';
import type { IdpName, UnixTimestamp, UserIdentity } from '@notifycal/shared/types';
import { doAndRethrow, tap } from '@utils/promises';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { successHandler } from './common/api-response-handlers';
import { type EncodedAndDecodedJwts, buildJwts } from './jwt';
import { SnsService } from './sns';
import { RefreshTokenBaseStore } from './stores/refresh-token-base-store';
import { UserBaseStore } from './stores/user-base-store';

function signIn<TIdpName extends IdpName>(
  user: UserStoreRecord<TIdpName>,
  identity: UserIdentity<TIdpName>,
  authorization: AuthorizationForIdp<TIdpName>,
  userProvider: UserBaseStore<TIdpName>
): Promise<UserStoreRecord<TIdpName>> {
  if (user.UserStatus !== 'banned') {
    const updatedUser = {
      ...user,
      LastSignInAt: Date.now() as UnixTimestamp
    };
    return userProvider.putUser(updatedUser, authorization).then(() => updatedUser);
  } else {
    return Promise.reject(
      new Error(`User with id '${identity.userId}' is banned and login is prohibited`)
    );
  }
}

function signUp<TIdpName extends IdpName>(
  identity: UserIdentity<TIdpName>,
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
    UserStatus: 'onboarding'
  };
  return userProvider.putUser(newUser, authorization).then(() => newUser);
}

export function buildJwtsAndStoreRefreshJwt<TIdpName extends IdpName>(
  identity: UserIdentity<TIdpName>,
  encodeAccessJwtConfig: EncodeAccessJwtConfig,
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig,
  store: RefreshTokenBaseStore
): Promise<EncodedAndDecodedJwts> {
  return buildJwts(identity, encodeAccessJwtConfig, encodeRefreshJwtConfig).then((jwts) => {
    return store
      .putToken({
        UserId: jwts.refreshToken.decoded.payload.sub,
        RefreshToken: jwts.refreshToken.encoded,
        RefreshTokenId: jwts.refreshToken.decoded.payload.jti,
        ExpiresAt: (jwts.refreshToken.decoded.payload.exp + 1) as UnixTimestamp // +1 just in case...
      })
      .then(() => jwts);
  });
}

function handleFailureToGetUserById<TIdpName extends IdpName>(
  identity: UserIdentity<TIdpName>
): (reason: unknown) => PromiseLike<never> {
  return (error) =>
    Promise.reject(
      new Error(
        `Failed to fetch '${identity.userId}' out of persistance. Unable to say if the user was signing in or up as the call to persistance failed`,
        { cause: error }
      )
    );
}

function generateAuthentication<TIdpName extends IdpName>(
  user: UserIdentityStoreRecord<TIdpName>,
  config: BaseLoginConfig,
  logger: Logger
): Promise<EncodedAndDecodedJwts> {
  const store = new RefreshTokenBaseStore(config.refreshTokenBaseStoreConfig, logger);
  return buildJwtsAndStoreRefreshJwt(
    extractUserIdentity(user),
    config.encodeAccessJwtConfig,
    config.encodeRefreshJwtConfig,
    store
  );
}

export function signInOrUp<TIdpName extends IdpName>(
  identity: UserIdentity<TIdpName>,
  authorization: AuthorizationForIdp<TIdpName>,
  config: BaseLoginConfig & ApiRestTopicConfig,
  logger: Logger
): Promise<EncodedAndDecodedJwts> {
  const userProvider = UserBaseStore.withConfig<TIdpName>(config.userBaseStoreConfig, logger);
  const snsService = SnsService.withConfig(config.apiRestTopicConfig, logger);

  return userProvider.getUserById(identity.userId).then((userOrNot) => {
    if (userOrNot) {
      return signIn(userOrNot, identity, authorization, userProvider)
        .then((user) => generateAuthentication(user, config, logger))
        .then(
          tap(() => snsService.safePublish(userSignedIn(identity, userOrNot))),
          doAndRethrow(() => snsService.safePublish(userSignInFailed(identity, userOrNot)))
        );
    } else {
      return signUp(identity, authorization, userProvider)
        .then((user) => generateAuthentication(user, config, logger))
        .then(
          tap(() => snsService.safePublish(userSignedUp(identity))),
          doAndRethrow(() => snsService.safePublish(userSignUpFailed(identity)))
        );
    }
  }, handleFailureToGetUserById<TIdpName>(identity));
}

export function _successHandler(jwts: EncodedAndDecodedJwts): APIGatewayProxyResult {
  return successHandler()({
    accessToken: jwts.accessToken.encoded,
    tokenType: 'Bearer',
    refreshToken: jwts.refreshToken.encoded
  });
}
