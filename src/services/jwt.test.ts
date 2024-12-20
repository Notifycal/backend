import { expect } from '@jest/globals';
import { buildJwt, decodeAndVerifyJwtSignature } from './jwt';
import { EncodeJwtConfig } from '@lambdas/api/login/config';
import { User } from '@model/User';
import { Jwt } from '@own-types/model';
import { DecodeJwtConfig } from '@model/DecodeJwtConfig';

describe('Jwt builder', () => {
  it('should build a jwt', () => {
    const { user, config } = {
      user: {
        UserId: 'test@notifycal.com'
      },
      config: {
        privateKey: `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIEF6NI6CascYRtOFXEQrbsbsi7ZzTsKaktkDRZ/PSZ8hoAoGCCqGSM49
AwEHoUQDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5AkbBnPn6rRLeuDhGwhClRkg5tp
0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
-----END EC PRIVATE KEY-----`,
        algorithm: 'ES256',
        issuer: 'notifycal.com',
        audience: 'notifycal.com',
        expiresIn: '5m'
      }
    };
    return expect(testit(user, config)).resolves.toBeTruthy();
  });

  it('should fail to build a jwt', () => {
    const { user, config } = {
      user: {
        UserId: 'test@notifycal.com'
      },
      config: {
        privateKey: `invalid_es256_private_key`,
        algorithm: 'ES256',
        issuer: 'notifycal.com',
        audience: 'notifycal.com',
        expiresIn: '5m'
      }
    };
    return expect(testit(user, config)).rejects.toEqual(
      'JWT could not be generated. Error: Error: secretOrPrivateKey must be an asymmetric key when using ES256'
    );
  });

  function testit(user: User, config: EncodeJwtConfig) {
    return buildJwt(user, user.UserId, config);
  }
});

describe('Jwt decoder/verifier', () => {
  it('should verify a jwt', () => {
    const { payload, encodeConfig, decodeConfig } = {
      payload: {
        email: 'test@notifycal.com'
      },
      encodeConfig: {
        privateKey: `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIEF6NI6CascYRtOFXEQrbsbsi7ZzTsKaktkDRZ/PSZ8hoAoGCCqGSM49
AwEHoUQDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5AkbBnPn6rRLeuDhGwhClRkg5tp
0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
-----END EC PRIVATE KEY-----`,
        algorithm: 'ES256',
        issuer: 'notifycal.com',
        audience: 'notifical.com',
        expiresIn: '5m'
      },
      decodeConfig: {
        publicKey: `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5Ak
bBnPn6rRLeuDhGwhClRkg5tp0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
-----END PUBLIC KEY-----`,
        maxAge: '5m',
        issuer: 'notifycal.com',
        audience: 'notifical.com'
      }
    };
    const result = buildJwt(payload, payload.email, encodeConfig).then((testJwt) =>
      testit(testJwt, decodeConfig)
    );
    return expect(result).resolves.toBeTruthy();
  });

  it('should fail to build a jwt when public key is invalid', () => {
    const { payload, encodeConfig, decodeConfig } = {
      payload: {
        email: 'test@notifycal.com'
      },
      encodeConfig: {
        privateKey: `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIEF6NI6CascYRtOFXEQrbsbsi7ZzTsKaktkDRZ/PSZ8hoAoGCCqGSM49
AwEHoUQDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5AkbBnPn6rRLeuDhGwhClRkg5tp
0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
-----END EC PRIVATE KEY-----`,
        algorithm: 'ES256',
        issuer: 'notifycal.com',
        audience: 'notifical.com',
        expiresIn: '5m'
      },
      decodeConfig: {
        publicKey: `INVALID_PUBLIC_KEY`,
        maxAge: '5m',
        issuer: 'notifycal.com',
        audience: 'notifical.com'
      }
    };

    const result = buildJwt(payload, payload.email, encodeConfig).then((testJwt) =>
      testit(testJwt, decodeConfig)
    );
    return expect(result).rejects.toEqual(
      'JWT verification failed. Error: JsonWebTokenError: invalid algorithm'
    );
  });

  it('should fail to build a jwt when jwt is invalid', () => {
    const config = {
      issuer: 'notifical.com',
      audience: 'notifical.com',
      maxAge: '5m',
      publicKey: `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5Ak
bBnPn6rRLeuDhGwhClRkg5tp0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
-----END PUBLIC KEY-----`
    };

    const testJwt = 'invalid_jwt';

    const result = testit(testJwt, config);
    return expect(result).rejects.toEqual(
      'JWT verification failed. Error: JsonWebTokenError: jwt malformed'
    );
  });

  function testit(jwt: Jwt, config: DecodeJwtConfig) {
    return decodeAndVerifyJwtSignature(jwt, config);
  }
});
