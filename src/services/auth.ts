import { logger } from '@common/powertools';
import type { BaseLoginConfig } from '@lambdas/api/post-login/config';
import { userSignedIn } from '@model/app-events/UserSignedInEvent';
import { userSignedUp } from '@model/app-events/UserSignedUpEvent';
import type {
  AuditTrailQueueConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import { extractIdentity } from '@model/UserIdentity';
import type { Identity, IdpName, UnixTimestamp } from '@notifycal/shared/types';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { AuditTrailService } from './audit-trail';
import { successHandler } from './common/api-response-handlers';
import { type EncodedAndDecodedJwts, buildJwts } from './jwt';
import { RefreshTokenBaseStore } from './stores/refresh-token-base-store';
import { UserBaseStore } from './stores/user-base-store';

function signIn<TIdpName extends IdpName>(
  user: UserStoreRecord<TIdpName>,
  identity: Identity<TIdpName>,
  authorization: AuthorizationForIdp<TIdpName>,
  userProvider: UserBaseStore<TIdpName>,
  auditTrailService: AuditTrailService
): Promise<UserStoreRecord<TIdpName>> {
  if (user.UserStatus !== 'banned') {
    const updatedUser = {
      ...user,
      LastSignInAt: Date.now() as UnixTimestamp
    };
    return userProvider.putUser(updatedUser, authorization).then(() => {
      const signInEvent = userSignedIn(identity, user);
      return auditTrailService.send(signInEvent).then(
        () => updatedUser,
        (error) => {
          logger.error(`UserSignedIn event failed to be sent`, {
            cause: error,
            event: signInEvent
          });
          return updatedUser;
        }
      );
    });
  } else {
    return Promise.reject(
      new Error(`User with id '${identity.userId}' is banned and login is prohibited`)
    );
  }
}

function signUp<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  authorization: AuthorizationForIdp<TIdpName>,
  userProvider: UserBaseStore<TIdpName>,
  auditTrailService: AuditTrailService
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
  return userProvider.putUser(newUser, authorization).then(() => {
    const signUpEvent = userSignedUp(identity);
    return auditTrailService.send(signUpEvent).then(
      () => newUser,
      (error) => {
        logger.error(`UserSignedUp event failed to be sent`, { cause: error, event: signUpEvent });
        return newUser;
      }
    );
  });
}

export function buildJwtsAndStoreRefreshJwt<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
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
  identity: Identity<TIdpName>
): (reason: unknown) => PromiseLike<never> {
  return (error) =>
    Promise.reject(
      new Error(
        `Failed to fetch '${identity.userId}' out of persistance. Unable to say if the user was signing in or up as the call to persistance failed`,
        { cause: error }
      )
    );
}

function signInOrUpAgainstPersistance<TIdpName extends IdpName>(
  userProvider: UserBaseStore<TIdpName>,
  identity: Identity<TIdpName>,
  authorization: AuthorizationForIdp<TIdpName>,
  auditTrailService: AuditTrailService
): Promise<UserStoreRecord<TIdpName>> {
  return userProvider.getUserById(identity.userId).then((userOrNot) => {
    if (userOrNot) {
      return signIn(userOrNot, identity, authorization, userProvider, auditTrailService);
    } else {
      return signUp(identity, authorization, userProvider, auditTrailService);
    }
  }, handleFailureToGetUserById<TIdpName>(identity));
}

export function signInOrUp<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  authorization: AuthorizationForIdp<TIdpName>,
  config: BaseLoginConfig & AuditTrailQueueConfig
): Promise<EncodedAndDecodedJwts> {
  const userProvider = UserBaseStore.withConfig<TIdpName>(config.userBaseStoreConfig);
  const auditTrailService = AuditTrailService.withConfig(config.auditTrailQueueConfig);
  const store = new RefreshTokenBaseStore(config.refreshTokenBaseStoreConfig);
  return signInOrUpAgainstPersistance<TIdpName>(
    userProvider,
    identity,
    authorization,
    auditTrailService
  ).then((user) =>
    buildJwtsAndStoreRefreshJwt(
      extractIdentity(user),
      config.encodeAccessJwtConfig,
      config.encodeRefreshJwtConfig,
      store
    )
  );
}

export function _successHandler(jwts: EncodedAndDecodedJwts): APIGatewayProxyResult {
  return successHandler()({
    accessToken: jwts.accessToken.encoded,
    tokenType: 'Bearer',
    refreshToken: jwts.refreshToken.encoded
  });
}
