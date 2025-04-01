import { logger } from '@common/powertools';
import type { BaseLoginConfig } from '@lambdas/api/post-login/config';
import * as userSignedInModule from '@model/app-events/UserSignedInEvent';
import * as userSignedUpModule from '@model/app-events/UserSignedUpEvent';
import type {
  AuditTrailQueueConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type {
  Email,
  Identity,
  IdpId,
  IdpName,
  UnixTimestamp,
  UserId
} from '@notifycal/shared/types';
import type { PrivateKey, Url } from '@own-types/model';
import { validJwts } from '@testing/utils/jwt';
import { v4 as uuid } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { AuditTrailService } from './audit-trail';
import { _successHandler, buildJwtsAndStoreRefreshJwt, signInOrUp } from './auth';
import { buildJwts, type EncodedAndDecodedJwts } from './jwt';
import { RefreshTokenBaseStore } from './stores/refresh-token-base-store';
import { UserBaseStore } from './stores/user-base-store';

vi.mock('./stores/user-base-store');
vi.mock('./audit-trail');
vi.mock('@model/app-events/UserSignedInEvent');
vi.mock('@model/app-events/UserSignedUpEvent');

const mockTimestamp = 1617206400000 as UnixTimestamp;
const validUserId: UserId = uuid() as UserId;
const validIdpName: IdpName = 'google.com';
const validEmail = 'test@example.com' as Email;

const validIdentity: Identity<'google.com'> = {
  userId: validUserId,
  email: validEmail,
  idp: validIdpName,
  idpId: 'google-123' as IdpId
};

const validAuthorization: AuthorizationForIdp<'google.com'> = {
  refreshToken: 'google-refresh-token'
};

const validConfig: BaseLoginConfig & AuditTrailQueueConfig = {
  userBaseStoreConfig: { tableName: 'Users-local' },
  refreshTokenBaseStoreConfig: { tableName: 'RefreshTokens-local' },
  auditTrailQueueConfig: { queueUrl: 'https://fakeUrl.com/audit-trail' as Url },
  encodeAccessJwtConfig: {
    secretOrPrivateKey: `some_fake_private_key` as PrivateKey,
    algorithm: 'ES256',
    issuer: 'test@notifycal.com',
    audience: 'test@notifycal.com',
    expiresIn: '5m'
  },
  encodeRefreshJwtConfig: {
    secretOrPrivateKey: `some_other_fake_private_key` as PrivateKey,
    algorithm: 'ES256',
    issuer: 'test@notifycal.com',
    audience: 'test@notifycal.com',
    expiresIn: '7d'
  }
};

const existingUser: UserStoreRecord<'google.com'> = {
  UserId: validUserId,
  Email: validEmail,
  Idp: validIdpName,
  IdpId: 'google-123' as IdpId,
  LastSignInAt: (mockTimestamp - 86400000) as UnixTimestamp,
  SignedUpAt: (mockTimestamp - 86400000) as UnixTimestamp,
  UserStatus: 'live'
};

describe('Auth Service', () => {
  describe('signInOrUp', () => {
    it('should sign in an existing user', async () => {
      const getUserByIdFn = vi.fn(() => Promise.resolve(existingUser));
      const putUserFn = vi.fn(() => Promise.resolve());
      const auditTrailSendFn = vi.fn(() => Promise.resolve());
      const buildJwtsFn = vi.fn(() => Promise.resolve(validJwts));
      const putTokenFn = vi.fn(() => Promise.resolve(null));
      const userSignedInSpy = vi
        .spyOn(userSignedInModule, 'userSignedIn')
        .mockReturnValue({} as userSignedInModule.UserSignedInEvent);
      const userSignedUpSpy = vi.spyOn(userSignedUpModule, 'userSignedUp');

      const result = await testSignInOrUp(
        validIdentity,
        validAuthorization,
        getUserByIdFn,
        putUserFn,
        auditTrailSendFn,
        buildJwtsFn,
        putTokenFn
      );

      expect(result).toStrictEqual(validJwts);
      expect(getUserByIdFn).toHaveBeenCalledOnce();
      expect(putUserFn).toHaveBeenCalledOnce();
      expect(auditTrailSendFn).toHaveBeenCalledOnce();
      expect(userSignedInSpy).toHaveBeenCalledOnce();
      // eslint-disable-next-line vitest/max-expects
      expect(userSignedUpSpy).not.toHaveBeenCalled();
    });

    it('should sign up a new user', async () => {
      const getUserByIdFn = vi.fn(() => Promise.resolve(null));
      const putUserFn = vi.fn(() => Promise.resolve());
      const auditTrailSendFn = vi.fn(() => Promise.resolve());
      const buildJwtsFn = vi.fn(() => Promise.resolve(validJwts));
      const putTokenFn = vi.fn(() => Promise.resolve(null));
      const userSignedInSpy = vi.spyOn(userSignedInModule, 'userSignedIn');
      const userSignedUpSpy = vi
        .spyOn(userSignedUpModule, 'userSignedUp')
        .mockReturnValue({} as userSignedUpModule.UserSignedUpEvent);

      const result = await testSignInOrUp(
        validIdentity,
        validAuthorization,
        getUserByIdFn,
        putUserFn,
        auditTrailSendFn,
        buildJwtsFn,
        putTokenFn
      );

      expect(result).toStrictEqual(validJwts);
      expect(getUserByIdFn).toHaveBeenCalledOnce();
      expect(putUserFn).toHaveBeenCalledOnce();
      expect(auditTrailSendFn).toHaveBeenCalledOnce();
      expect(userSignedInSpy).not.toHaveBeenCalled();
      // eslint-disable-next-line vitest/max-expects
      expect(userSignedUpSpy).toHaveBeenCalledOnce();
    });

    it('should reject when trying to sign in a banned user', async () => {
      const bannedUser: UserStoreRecord<'google.com'> = { ...existingUser, UserStatus: 'banned' };
      const getUserByIdFn = vi.fn(() => Promise.resolve(bannedUser));
      const putUserFn = vi.fn();
      const auditTrailSendFn = vi.fn();
      const buildJwtsFn = vi.fn();
      const putTokenFn = vi.fn();

      const promise = testSignInOrUp(
        validIdentity,
        validAuthorization,
        getUserByIdFn,
        putUserFn,
        auditTrailSendFn,
        buildJwtsFn,
        putTokenFn
      );

      await expect(promise).rejects.toThrow(
        `User with id '${validUserId}' is banned and login is prohibited`
      );
      expect(putUserFn).not.toHaveBeenCalled();
      expect(auditTrailSendFn).not.toHaveBeenCalled();
      expect(buildJwtsFn).not.toHaveBeenCalled();
      expect(putTokenFn).not.toHaveBeenCalled();
    });

    it('should reject when failing to get user by id', async () => {
      const error = new Error('Database error');
      const getUserByIdFn = vi.fn(() => Promise.reject(error));
      const putUserFn = vi.fn();
      const auditTrailSendFn = vi.fn();
      const buildJwtsFn = vi.fn();
      const putTokenFn = vi.fn();

      const promise = testSignInOrUp(
        validIdentity,
        validAuthorization,
        getUserByIdFn,
        putUserFn,
        auditTrailSendFn,
        buildJwtsFn,
        putTokenFn
      );

      await expect(promise).rejects.toThrow(
        `Failed to fetch '${validUserId}' out of persistance. Unable to say if the user was signing in or up as the call to persistance failed`
      );
      expect(putUserFn).not.toHaveBeenCalled();
      expect(auditTrailSendFn).not.toHaveBeenCalled();
      expect(buildJwtsFn).not.toHaveBeenCalled();
      expect(putTokenFn).not.toHaveBeenCalled();
    });

    it('should still complete sign in when audit trail event fails to send', async () => {
      const getUserByIdFn = vi.fn(() => Promise.resolve(existingUser));
      const putUserFn = vi.fn(() => Promise.resolve());
      const auditError = new Error('Audit trail failure');
      const auditTrailSendFn = vi.fn(() => Promise.reject(auditError));
      const buildJwtsFn = vi.fn(() => Promise.resolve(validJwts));
      const putTokenFn = vi.fn(() => Promise.resolve(null));
      const loggerErrorSpy = vi.spyOn(logger, 'error');

      const result = await testSignInOrUp(
        validIdentity,
        validAuthorization,
        getUserByIdFn,
        putUserFn,
        auditTrailSendFn,
        buildJwtsFn,
        putTokenFn
      );

      expect(result).toStrictEqual(validJwts);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'UserSignedIn event failed to be sent',
        expect.objectContaining({ cause: auditError })
      );
    });
  });

  describe('buildJwtsAndStoreRefreshJwt', () => {
    it('should build JWTs and store refresh token', async () => {
      const buildJwtsFn = vi.fn(() => Promise.resolve(validJwts));
      const putTokenFn = vi.fn(() => Promise.resolve());

      const result = await testBuildJwtsAndStoreRefreshJwt(
        validIdentity,
        validConfig.encodeAccessJwtConfig,
        validConfig.encodeRefreshJwtConfig,
        buildJwtsFn,
        putTokenFn
      );

      expect(result).toStrictEqual(validJwts);
      expect(buildJwtsFn).toHaveBeenCalledWith(
        validIdentity,
        validConfig.encodeAccessJwtConfig,
        validConfig.encodeRefreshJwtConfig
      );
      expect(putTokenFn).toHaveBeenCalledOnce();
    });

    it('should reject when building jwts fails', async () => {
      const error = new Error('Build Jwts error');
      const buildJwtsFn = vi.fn(() => Promise.reject(error));
      const putTokenFn = vi.fn(() => Promise.resolve());

      const promise = testBuildJwtsAndStoreRefreshJwt(
        validIdentity,
        validConfig.encodeAccessJwtConfig,
        validConfig.encodeRefreshJwtConfig,
        buildJwtsFn,
        putTokenFn
      );

      await expect(promise).rejects.toBe(error);
      expect(buildJwtsFn).toHaveBeenCalledOnce();
      expect(putTokenFn).not.toHaveBeenCalled();
    });

    it('should reject when storing token fails', async () => {
      const error = new Error('Token storage error');
      const buildJwtsFn = vi.fn(() => Promise.resolve(validJwts));
      const putTokenFn = vi.fn(() => Promise.reject(error));

      const promise = testBuildJwtsAndStoreRefreshJwt(
        validIdentity,
        validConfig.encodeAccessJwtConfig,
        validConfig.encodeRefreshJwtConfig,
        buildJwtsFn,
        putTokenFn
      );

      await expect(promise).rejects.toBe(error);
      expect(buildJwtsFn).toHaveBeenCalledOnce();
      expect(putTokenFn).toHaveBeenCalledOnce();
    });
  });

  describe('_successHandler', () => {
    it('should return API Gateway response with JWT information', () => {
      const result = _successHandler(validJwts);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toStrictEqual({
        accessToken: validJwts.accessToken.encoded,
        tokenType: 'Bearer',
        refreshToken: validJwts.refreshToken.encoded
      });
    });
  });

  function testSignInOrUp<TIdpName extends IdpName>(
    identity: Identity<TIdpName>,
    authorization: AuthorizationForIdp<TIdpName>,
    getUserByIdFn: () => Promise<UserStoreRecord<TIdpName> | null>,
    putUserFn: () => Promise<void>,
    auditTrailSendFn: () => Promise<void>,
    buildJwtsFn: () => Promise<EncodedAndDecodedJwts>,
    putTokenFn: () => Promise<null>
  ): Promise<EncodedAndDecodedJwts> {
    vi.mock('./stores/user-base-store');
    const userBaseStoreMock = {
      getUserById: vi.fn().mockImplementation(getUserByIdFn),
      putUser: vi.fn().mockImplementation(putUserFn)
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(UserBaseStore.withConfig).mockReturnValue(
      userBaseStoreMock as unknown as UserBaseStore<TIdpName>
    );

    vi.mock('./audit-trail');
    const auditTrailServiceMock = {
      send: vi.fn().mockImplementation(auditTrailSendFn)
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(AuditTrailService.withConfig).mockReturnValue(
      auditTrailServiceMock as unknown as AuditTrailService
    );

    vi.mock('./stores/refresh-token-base-store');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(RefreshTokenBaseStore.prototype.putToken).mockImplementation(putTokenFn);

    vi.mock('./jwt', () => ({
      buildJwts: vi.fn()
    }));
    vi.mocked(buildJwts).mockImplementation(buildJwtsFn);

    return signInOrUp(identity, authorization, validConfig);
  }

  function testBuildJwtsAndStoreRefreshJwt<TIdpName extends IdpName>(
    identity: Identity<TIdpName>,
    encodeAccessJwtConfig: EncodeAccessJwtConfig,
    encodeRefreshJwtConfig: EncodeRefreshJwtConfig,
    buildJwtsFn: () => Promise<EncodedAndDecodedJwts>,
    putTokenFn: () => Promise<void>
  ): Promise<EncodedAndDecodedJwts> {
    vi.mock('./jwt', () => ({
      buildJwts: vi.fn()
    }));
    vi.mocked(buildJwts).mockImplementation(buildJwtsFn);

    vi.mock('./stores/refresh-token-base-store');
    const refreshTokenStoreMock = {
      putToken: vi.fn().mockImplementation(putTokenFn)
    };
    const store = new RefreshTokenBaseStore(validConfig.refreshTokenBaseStoreConfig);
    vi.spyOn(store, 'putToken').mockImplementation(refreshTokenStoreMock.putToken);

    return buildJwtsAndStoreRefreshJwt(
      identity,
      encodeAccessJwtConfig,
      encodeRefreshJwtConfig,
      store
    );
  }
});
