import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { Email, IdpName, PhoneNumber } from '@notifycal/shared/types';
import { phoneNumberByEmail } from '@services/contacts';
import { describe, expect, it, vi } from 'vitest';
import { GooglePeople } from './google/people';

const validIdpName: IdpName = 'google.com';
const validIdpAuthorization: AuthorizationForIdp<IdpName> = {
  refreshToken: 'some google refresh token'
};
const validEmail: Email = 'testuser@gmail.com' as Email;
const validPhoneNumbers: Array<PhoneNumber> = ['+123456789' as PhoneNumber];

describe('Contacts Service', () => {
  it('should get the phone numbers from idp google.com', () => {
    const googlePhoneNumbersFn = () => Promise.resolve(validPhoneNumbers);

    return testit(validEmail, validIdpAuthorization, validIdpName, googlePhoneNumbersFn).then(
      (list) => {
        expect(list).toStrictEqual(validPhoneNumbers);
      }
    );
  });

  it('should throw an error if idp is google.com and GooglePeople service fails', () => {
    const error = new Error('Booooom!');
    const googlePhoneNumbersFn = () => Promise.reject(error);

    const result = testit(validEmail, validIdpAuthorization, validIdpName, googlePhoneNumbersFn);

    return expect(result).rejects.toBe(error);
  });

  async function testit(
    email: Email,
    idpAuthorization: AuthorizationForIdp<IdpName>,
    idp: IdpName,
    googlePhoneNumbersFn: () => Promise<Array<PhoneNumber>>
  ): Promise<Array<PhoneNumber>> {
    vi.mock('@services/google/people');
    const mockInstance2 = {
      getPhoneNumbersBy: vi.fn().mockImplementation(googlePhoneNumbersFn)
    };

    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(GooglePeople.withRefreshToken).mockReturnValue(
      mockInstance2 as unknown as GooglePeople
    );

    return phoneNumberByEmail(email, idpAuthorization, idp);
  }
});
