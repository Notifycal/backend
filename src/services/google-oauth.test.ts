/* eslint-disable camelcase */
import { verifyGoogleIdentity } from './google-oauth';
import { type LoginTicket, type TokenPayload, OAuth2Client } from 'google-auth-library';
import { describe, expect, it, vi } from 'vitest';
import type { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client';
import type { Identity } from '@model/Identity';
import { idGenerator } from './id-generator';
import type { Uuid } from '@own-types/model';

const validConfig = {
  clientId: 'valid-client-id',
  clientSecret: 'valid-client-secret',
  redirectUri: 'http://localhost/callback'
};

const validGoogleCode = 'valid-google-code';
const validIdToken = 'valid-id-token';
const validUserId = 'e46d71fd-4e76-5925-8a80-da1e3358d4c2' as Uuid;
const validEmail = 'user@example.com';

const validGetTokenResponse: GetTokenResponse = { tokens: { id_token: validIdToken }, res: null };
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

describe('verifyGoogleIdentity', () => {
  it('should return a valid Identity when Google credentials are valid', async () => {
    const getTokenFn = () => Promise.resolve(validGetTokenResponse);
    const verifyIdTokenFn = () => Promise.resolve(validVerifyIdTokenResponse);

    const result = await testIt(getTokenFn, verifyIdTokenFn);

    expect(result).toStrictEqual({
      userId: validUserId,
      email: validEmail,
      idp: 'google.com',
      idpId: validUserId
    });
  });

  it('should throw an error if the id_token is missing in the response', async () => {
    const getTokenFn = () => Promise.resolve({ tokens: {}, res: null });
    const verifyIdTokenFn = () => Promise.resolve(validVerifyIdTokenResponse);

    await expect(testIt(getTokenFn, verifyIdTokenFn)).rejects.toThrow(
      'Google token id was not present in token obtained from Google using user google,s code'
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

  it('should throw an error if id or email is missing in the token payload', async () => {
    const getTokenFn = () => Promise.resolve(validGetTokenResponse);
    const verifyIdTokenFn = () =>
      Promise.resolve({
        getUserId: () => null,
        getPayload: () => ({
          ...validLoginTokenPayload,
          email: undefined
        })
      });

    await expect(testIt(getTokenFn, verifyIdTokenFn)).rejects.toThrow(
      `Id and/or Email could not be extracted out of Google token id. Extracted id: 'null' and email: 'undefined'`
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
): Promise<Identity> {
  vi.mock('google-auth-library', () => ({
    OAuth2Client: vi.fn()
  }));
  const mockGetToken = vi.fn().mockImplementation(getTokenFn);
  const mockVerifyIdToken = vi.fn().mockImplementation(verifyIdTokenFn);
  OAuth2Client.prototype.getToken = mockGetToken;
  OAuth2Client.prototype.verifyIdToken = mockVerifyIdToken;

  vi.mock('@services/id-generator', () => ({
    idGenerator: vi.fn()
  }));
  vi.mocked(idGenerator).mockReturnValue(mockIdGenerated);

  return verifyGoogleIdentity(validGoogleCode, validConfig);
}
