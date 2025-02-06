import type { IdpConfigs } from '@model/Config';
import type { AuthorizationForIdp, UserGoogleAuthorization } from '@model/IdpAuthorization';
import type { Email, IdpName, UserId, PhoneNumber } from '@notifycal/shared/types';
import { phoneNumberByEmail } from '@services/contacts';
import { UserBaseStore, type UserBaseStoreConfig } from '@services/stores/user-base-store';
import { v4 as uuid } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { GooglePeople } from './google/people';

const validUserId: UserId = uuid() as UserId;
const validEmail: Email = 'testuser@gmail.com' as Email;
const validIdpConfigs: IdpConfigs = {
  'google.com': {
    clientId: 'mock-client-id',
    clientSecret: 'mock-client-secret',
    redirectUri: 'mock-redirect-uri'
  }
};
const validUserBaseStoreConfig: UserBaseStoreConfig = {
  tableName: 'Users-local'
};
const validPhoneNumbers: Array<PhoneNumber> = ['+123456789' as PhoneNumber];
const validIdpName: IdpName = 'google.com';
const validAuthorizationForIdp: UserGoogleAuthorization = {
  refreshToken: 'some refresh token'
};

describe('Contacts Service', () => {
  it('should get the phone numbers from idp google.com', () => {
    const googlePhoneNumbersFn = () => Promise.resolve(validPhoneNumbers);
    const getIdpAuthorizationFn = () => Promise.resolve(validAuthorizationForIdp);

    return testit(
      validEmail,
      validUserId,
      validIdpName,
      validIdpConfigs,
      getIdpAuthorizationFn,
      googlePhoneNumbersFn
    ).then((list) => {
      expect(list).toStrictEqual(validPhoneNumbers);
    });
  });

  it('should throw an error if idp authorization was not present in persistence', () => {
    const googlePhoneNumbersFn = () => Promise.resolve(validPhoneNumbers);
    const getIdpAuthorizationFn = () => Promise.resolve(undefined);

    const result = testit(
      validEmail,
      validUserId,
      validIdpName,
      validIdpConfigs,
      getIdpAuthorizationFn,
      googlePhoneNumbersFn
    );

    return expect(result).rejects.toThrow(
      `Google Idp authorization could not be found in persistance for user id ${validUserId}`
    );
  });

  it('should throw an error if idp authorization could not be obtained', () => {
    const error = new Error('Boom!');
    const googlePhoneNumbersFn = () => Promise.resolve(validPhoneNumbers);
    const getIdpAuthorizationFn = () => Promise.reject(error);

    const result = testit(
      validEmail,
      validUserId,
      validIdpName,
      validIdpConfigs,
      getIdpAuthorizationFn,
      googlePhoneNumbersFn
    );

    return expect(result).rejects.toBe(error);
  });

  it('should throw an error if idp is google.com and GooglePeople service fails', () => {
    const error = new Error('Booooom!');
    const googlePhoneNumbersFn = () => Promise.reject(error);
    const getIdpAuthorizationFn = () => Promise.resolve(validAuthorizationForIdp);

    const result = testit(
      validEmail,
      validUserId,
      validIdpName,
      validIdpConfigs,
      getIdpAuthorizationFn,
      googlePhoneNumbersFn
    );

    return expect(result).rejects.toBe(error);
  });

  async function testit(
    email: Email,
    userId: UserId,
    idp: IdpName,
    idpConfigs: IdpConfigs,
    getIdpAuthorizationFn: () => Promise<AuthorizationForIdp<IdpName> | undefined>,
    googlePhoneNumbersFn: () => Promise<Array<PhoneNumber> | undefined>,
    userBaseStoreConfig: UserBaseStoreConfig = validUserBaseStoreConfig
  ): Promise<Array<PhoneNumber> | undefined> {
    vi.mock('@services/stores/user-base-store');
    const userBaseStoreMock = {
      getIdpAuthorization: vi.fn().mockImplementation(getIdpAuthorizationFn)
    };

    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(UserBaseStore.withConfig).mockReturnValue(
      userBaseStoreMock as unknown as UserBaseStore<IdpName>
    );

    vi.mock('@services/google/people');
    const mockInstance2 = {
      getPhoneNumbersBy: vi.fn().mockImplementation(googlePhoneNumbersFn)
    };

    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(GooglePeople.withRefreshToken).mockReturnValue(
      mockInstance2 as unknown as GooglePeople
    );

    return phoneNumberByEmail(email, userId, idp, idpConfigs, userBaseStoreConfig);
  }
});
