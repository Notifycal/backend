import { expect } from '@jest/globals';
import { buildJwt, decodeAndVerifyJwtSignature } from './jwt';
import { EncodeJwtConfig } from '@lambdas/api/post-login/config';
import { Jwt } from '@own-types/model';
import { sleep } from '@testing/utils/utils';
import { DecodeJwtConfig } from '@model/Config';

const validPrivateKey = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIEF6NI6CascYRtOFXEQrbsbsi7ZzTsKaktkDRZ/PSZ8hoAoGCCqGSM49
AwEHoUQDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5AkbBnPn6rRLeuDhGwhClRkg5tp
0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
-----END EC PRIVATE KEY-----`;
const validPublicKey = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5Ak
bBnPn6rRLeuDhGwhClRkg5tp0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
-----END PUBLIC KEY-----`;

const validIssuer = 'issuer.notifycal.com';
const validAudience = 'api.notifycal.com';

const validEncodeConfig = {
  privateKey: validPrivateKey,
  algorithm: 'ES256',
  issuer: validIssuer,
  audience: validAudience,
  expiresIn: '5m'
};
const validDecodeConfig = {
  publicKey: validPublicKey,
  expiresIn: '5m',
  issuer: validIssuer,
  audience: validAudience
};
const validSubject = 'testing@notifycal';
const validPayload = {
  email: 'test@notifycal.com'
};

describe('Jwt builder', () => {
  it('should build a jwt', () => {
    return expect(testit(validPayload, validEncodeConfig)).resolves.toBeTruthy();
  });

  it('should fail to build a jwt', () => {
    const config = {
      ...validEncodeConfig,
      privateKey: `invalid_es256_private_key`
    };
    return expect(testit(validPayload, config)).rejects.toEqual(
      'JWT could not be generated. Error: Error: secretOrPrivateKey must be an asymmetric key when using ES256'
    );
  });

  function testit(payload: object, config: EncodeJwtConfig) {
    return buildJwt(payload, validSubject, config);
  }
});

describe('Jwt decoder/verifier', () => {
  it('should verify a jwt - it ignores subject claim', () => {
    const result = buildJwt(validPayload, validSubject, validEncodeConfig).then((testJwt) =>
      testit(testJwt, validDecodeConfig)
    );
    return expect(result).resolves.toBeTruthy();
  });

  it('should fail to verify a jwt when public key is invalid', () => {
    const decodeConfig = {
      ...validDecodeConfig,
      publicKey: `INVALID_PUBLIC_KEY`
    };

    const result = buildJwt(validPayload, validSubject, validEncodeConfig).then((testJwt) =>
      testit(testJwt, decodeConfig)
    );
    return expect(result).rejects.toEqual(
      'JWT verification failed. Error: JsonWebTokenError: invalid algorithm'
    );
  });

  it('should fail to verify a jwt when jwt is invalid', () => {
    const testJwt = 'invalid_jwt';

    const result = testit(testJwt, validDecodeConfig);
    return expect(result).rejects.toEqual(
      'JWT verification failed. Error: JsonWebTokenError: jwt malformed'
    );
  });

  [
    ['issuer', validIssuer],
    ['audience', validAudience]
  ].forEach(([jwtClaimKeyUnderTest, expectedClaimValue]) => {
    it(`should fail to verify a jwt when ${jwtClaimKeyUnderTest} does not match`, () => {
      const encodeConfig = {
        ...validEncodeConfig,
        [jwtClaimKeyUnderTest]: 'rubbish'
      };

      const result = buildJwt(validPayload, validSubject, encodeConfig).then((testJwt) =>
        testit(testJwt, validDecodeConfig)
      );
      return expect(result).rejects.toEqual(
        `JWT verification failed. Error: JsonWebTokenError: jwt ${jwtClaimKeyUnderTest} invalid. expected: ${expectedClaimValue}`
      );
    });

    it(`should fail to verify a an expired jwt`, async () => {
      const encodeConfig = {
        ...validEncodeConfig,
        expiresIn: '1s'
      };
      const decodeConfig = {
        ...validDecodeConfig,
        maxAge: '1s'
      };

      const result = buildJwt(validPayload, validSubject, encodeConfig)
        .then((testJwt) => sleep(2000).then(() => testJwt))
        .then((testJwt) => testit(testJwt, decodeConfig));
      return expect(result).rejects.toEqual(
        `JWT verification failed. Error: TokenExpiredError: jwt expired`
      );
    });
  });

  function testit(jwt: Jwt, config: DecodeJwtConfig) {
    return decodeAndVerifyJwtSignature(jwt, config);
  }
});
