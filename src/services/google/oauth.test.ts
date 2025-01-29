import { GoogleOAuth } from './oauth';
/* eslint-disable camelcase */
import type { Identity } from '@model/Identity';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { Uuid } from '@own-types/model';
import {
  type Credentials,
  type LoginTicket,
  OAuth2Client,
  type TokenPayload
} from 'google-auth-library';
import type { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client';
import { describe, expect, it, vi } from 'vitest';
import { idGenerator } from '../id-generator';

const validConfig = {
  clientId: 'valid-client-id',
  clientSecret: 'valid-client-secret',
  redirectUri: 'http://localhost/callback'
};

const validGoogleCode = 'valid-google-code';
const validIdToken = 'valid-id-token';
const validUserId = 'e46d71fd-4e76-5925-8a80-da1e3358d4c2' as Uuid;
const validEmail = 'user@example.com';

const validGetTokenResponseTokens: Credentials = {
  id_token: validIdToken,
  refresh_token: 'valid_refresh_token'
};
const validGetTokenResponse: GetTokenResponse = {
  tokens: validGetTokenResponseTokens,
  res: null
};
const validLoginTokenPayload: TokenPayload = {
  email: validEmail,
  email_verified: true,
  aud: 'some audience',
  exp: 1324132339,
  iat: 1225245425,
  iss: 'some issuer',
  sub: 'some subject'
};
type LoginTicketWithoutUnusedValues = Omit<Omit<LoginTicket, 'getEnvelope'>, 'getAttributes'>;
const validVerifyIdTokenResponse: LoginTicketWithoutUnusedValues = {
  getUserId: () => validUserId,
  getPayload: () => validLoginTokenPayload
};

describe('GoogleOAuth Service verifyIdentity', () => {
  it('should return a valid Identity when Google credentials are valid', async () => {
    const getTokenFn = () => Promise.resolve(validGetTokenResponse);
    const verifyIdTokenFn = () => Promise.resolve(validVerifyIdTokenResponse);

    const result = await testIt(getTokenFn, verifyIdTokenFn);

    expect(result).toStrictEqual([
      {
        userId: validUserId,
        email: validEmail,
        idp: 'google.com',
        idpId: validUserId
      },
      {
        refreshToken: validGetTokenResponse.tokens.refresh_token
      }
    ]);
  });

  it('should throw an error if the id_token is missing in the response', async () => {
    const getTokenFn = () =>
      Promise.resolve({
        ...validGetTokenResponse,
        tokens: {
          id_token: undefined
        }
      });
    const verifyIdTokenFn = () => Promise.resolve(validVerifyIdTokenResponse);

    await expect(testIt(getTokenFn, verifyIdTokenFn)).rejects.toThrow(
      `Google token id was not present in token obtained from Google using user's google code`
    );
  });

  it('should throw an error if the refresh_token is missing in the response', async () => {
    const getTokenFn = () =>
      Promise.resolve({
        ...validGetTokenResponse,
        tokens: {
          id_token: 'valid id token',
          refresh_token: undefined
        }
      });
    const verifyIdTokenFn = () => Promise.resolve(validVerifyIdTokenResponse);

    await expect(testIt(getTokenFn, verifyIdTokenFn)).rejects.toThrow(
      `Google refresh token was not present in token obtained from Google using user's google code`
    );
  });

  it('should throw an error if the email is not verified', async () => {
    const getTokenFn = () => Promise.resolve(validGetTokenResponse);
    const verifyIdTokenFn = () =>
      Promise.resolve({
        getUserId: () => validUserId,
        getPayload: () => ({
          ...validLoginTokenPayload,
          email_verified: false
        })
      });

    await expect(testIt(getTokenFn, verifyIdTokenFn)).rejects.toThrow(
      `Google user with id: '${validUserId}' and email: '${validEmail}' isn't verified at google. We cannot let them in.`
    );
  });

  it('should throw an error if id is missing in the token payload', async () => {
    const getTokenFn = () => Promise.resolve(validGetTokenResponse);
    const verifyIdTokenFn = () =>
      Promise.resolve({
        getUserId: () => null,
        getPayload: () => validLoginTokenPayload
      });

    await expect(testIt(getTokenFn, verifyIdTokenFn)).rejects.toThrow(
      `Id could not be extracted out of Google token id. Extracted id: 'null' and email: '${validLoginTokenPayload.email}'`
    );
  });

  it('should throw an error if email is missing in the token payload', async () => {
    const getTokenFn = () => Promise.resolve(validGetTokenResponse);
    const verifyIdTokenFn = () =>
      Promise.resolve({
        getUserId: () => validUserId,
        getPayload: () => ({
          ...validLoginTokenPayload,
          email: undefined
        })
      });

    await expect(testIt(getTokenFn, verifyIdTokenFn)).rejects.toThrow(
      `Email could not be extracted out of Google token id. Extracted id: '${validUserId}' and email: 'undefined'`
    );
  });

  it('should throw an error if getToken fails', async () => {
    const getTokenFn = () => Promise.reject(new Error('Failed to retrieve token'));
    const verifyIdTokenFn = () => Promise.resolve(validVerifyIdTokenResponse);

    await expect(testIt(getTokenFn, verifyIdTokenFn)).rejects.toThrow('Failed to retrieve token');
  });

  it('should throw an error if verifyIdToken fails', async () => {
    const getTokenFn = () => Promise.resolve(validGetTokenResponse);
    const verifyIdTokenFn = () => Promise.reject(new Error('Failed to verify token'));

    await expect(testIt(getTokenFn, verifyIdTokenFn)).rejects.toThrow('Failed to verify token');
  });
});

function testIt(
  getTokenFn: () => Promise<GetTokenResponse>,
  verifyIdTokenFn: () => Promise<Omit<Omit<LoginTicket, 'getEnvelope'>, 'getAttributes'>>,
  mockIdGenerated: Uuid = validUserId
): Promise<[Identity<'google.com'>, AuthorizationForIdp<'google.com'>]> {
  vi.mock('google-auth-library');
  vi.mocked(OAuth2Client).mockReturnValue({
    verifyIdToken: vi.fn().mockImplementation(verifyIdTokenFn),
    getToken: vi.fn().mockImplementation(getTokenFn),
    get gaxios() {
      return null;
    }
  } as unknown as OAuth2Client);
  vi.mock('@services/id-generator');
  vi.mocked(idGenerator).mockReturnValue(mockIdGenerated);
  return GoogleOAuth.withConfig(validConfig).verifyIdentity(validGoogleCode);
}
