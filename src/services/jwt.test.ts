import { expect } from '@jest/globals';
import { buildJwt } from './jwt';
import { JwtConfig } from '@lambdas/api/login/config';
import { User } from '@model/User';

describe('Jwt builder', () => {
  it('should build a jwt', () => {
    const { user, privateKey, config } = {
      user: {
        UserId: 'test@notifycal.com'
      },
      privateKey: `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIEF6NI6CascYRtOFXEQrbsbsi7ZzTsKaktkDRZ/PSZ8hoAoGCCqGSM49
AwEHoUQDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5AkbBnPn6rRLeuDhGwhClRkg5tp
0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
-----END EC PRIVATE KEY-----`,
      config: {
        algorithm: 'ES256',
        issuer: 'notifycal.com',
        expiresIn: '5m'
      }
    };
    return expect(testit(user, privateKey, config)).resolves.toBeTruthy();
  });

  it('should fail to build a jwt', () => {
    const { user, privateKey, config } = {
      user: {
        UserId: 'test@notifycal.com'
      },
      privateKey: `invalid_es256_private_key`,
      config: {
        algorithm: 'ES256',
        issuer: 'notifycal.com',
        expiresIn: '5m'
      }
    };
    return expect(testit(user, privateKey, config)).rejects.toEqual(
      'JWT could not be generated. Error: Error: secretOrPrivateKey must be an asymmetric key when using ES256'
    );
  });

  function testit(user: User, privateKey: string, config: JwtConfig) {
    return buildJwt(user, privateKey, config);
  }
});
