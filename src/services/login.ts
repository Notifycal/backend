import { logger } from '@common/powertools';
import { userSignedIn } from '@model/app-events/UserSignedIn';
import { userSignedUp } from '@model/app-events/UserSignedUp';
import type { EncodeAccessJwtConfig, EncodeRefreshJwtConfig, SqsQueueConfig } from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type { Identity, IdpName, UnixTimestamp } from '@notifycal/shared/types';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { AuditTrailService } from './audit-trail';
import { successHandler } from './common/api-response-handlers';
import { type EncodedAndDecodedJwts, buildJwts } from './jwt';
import type { RefreshTokenBaseStore } from './stores/refresh-token-base-store';
import { UserBaseStore, type UserBaseStoreConfig } from './stores/user-base-store';

function signInUser<TIdpName extends IdpName>(
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

function signUpUser<TIdpName extends IdpName>(
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

export function signInOrUpUser<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  authorization: AuthorizationForIdp<TIdpName>,
  config: UserBaseStoreConfig,
  auditTrailQueueConfig: SqsQueueConfig
): Promise<UserStoreRecord<IdpName>> {
  const userProvider = UserBaseStore.withConfig(config);
  const auditTrailService = AuditTrailService.withConfig(auditTrailQueueConfig);
  return userProvider.getUserById(identity.userId).then(
    (userOrNot) => {
      if (userOrNot) {
        return signInUser(userOrNot, identity, authorization, userProvider, auditTrailService);
      } else {
        return signUpUser(identity, authorization, userProvider, auditTrailService);
      }
    },
    (error) =>
      Promise.reject(
        new Error(`User with id '${identity.userId}' could not sign in/up`, { cause: error })
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
