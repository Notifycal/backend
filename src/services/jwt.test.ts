import {
  type EncodedAndDecodedJwt,
  type EncodedAndDecodedJwts,
  buildJwt,
  buildJwts,
  decodeAndVerifyJwtSignature,
  decodeJwt
} from './jwt';
import type { Jwt, UserId } from '@own-types/model';
import { sleep } from '@testing/utils/utils';
import type {
  DecodeAccessJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import { type AccessToken, accessTokenSchema } from '@model/Jwt';
import type { ZodSchema } from 'zod';

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
const validAccessTokenPayload = {
  email: 'test@notifycal.com',
  role: 'user',
  permissions: {}
};

describe('Jwt builder', () => {
  it('should build a jwt', () => {
    return expect(testit(validAccessTokenPayload, validEncodeConfig)).resolves.toBeTruthy();
  });

  it('should fail to build a jwt', () => {
    const config = {
      ...validEncodeConfig,
      privateKey: `invalid_es256_private_key`
    };
    return expect(testit(validAccessTokenPayload, config)).rejects.toEqual(
      new Error(
        'JWT could not be generated. Error: secretOrPrivateKey must be an asymmetric key when using ES256'
      )
    );
  });

  function testit(
    payload: object,
    config: EncodeAccessJwtConfig
  ): Promise<EncodedAndDecodedJwt<AccessToken>> {
    return buildJwt(payload, accessTokenSchema, validSubject, config);
  }
});

describe('Jwts builder', () => {
  const validUserId = 'test@notifycal.com';
  it('should build a jwts', () => {
    return expect(testit(validUserId, validEncodeConfig, validEncodeConfig)).resolves.toBeTruthy();
  });

  it('should fail to build access jwt', () => {
    const invalidEncodeJwtConfig = {
      ...validEncodeConfig,
      privateKey: `invalid_es256_private_key`
    };
    return expect(testit(validUserId, invalidEncodeJwtConfig, validEncodeConfig)).rejects.toEqual(
      new Error(
        'Access JWT could not be generated. Error: secretOrPrivateKey must be an asymmetric key when using ES256'
      )
    );
  });

  it('should fail to build refresh jwt', () => {
    const invalidEncodeRefreshJwtConfig = {
      ...validEncodeConfig,
      privateKey: `invalid_es256_private_key`
    };
    return expect(
      testit(validUserId, validEncodeConfig, invalidEncodeRefreshJwtConfig)
    ).rejects.toEqual(
      new Error(
        'Refresh JWT could not be generated. Error: secretOrPrivateKey must be an asymmetric key when using ES256'
      )
    );
  });

  function testit(
    userId: UserId,
    encodeJwtConfig: EncodeAccessJwtConfig,
    encodeRefreshJwtConfig: EncodeRefreshJwtConfig
  ): Promise<EncodedAndDecodedJwts> {
    return buildJwts(userId, encodeJwtConfig, encodeRefreshJwtConfig);
  }
});

describe('Jwt decoder/verifier with signature', () => {
  it('should verify a jwt - it ignores subject claim', () => {
    const result = buildJwt(
      validAccessTokenPayload,
      accessTokenSchema,
      validSubject,
      validEncodeConfig
    ).then((testJwt) => testit(testJwt.encoded, accessTokenSchema, validDecodeConfig));
    return expect(result).resolves.toBeTruthy();
  });

  it('should fail to verify a jwt when public key is invalid', () => {
    const decodeConfig = {
      ...validDecodeConfig,
      publicKey: `INVALID_PUBLIC_KEY`
    };

    const result = buildJwt(
      validAccessTokenPayload,
      accessTokenSchema,
      validSubject,
      validEncodeConfig
    ).then((testJwt) => testit(testJwt.encoded, accessTokenSchema, decodeConfig));
    return expect(result).rejects.toEqual(
      new Error('JWT verification failed. Error: invalid algorithm')
    );
  });

  it('should fail to verify a jwt when jwt is invalid', () => {
    const testJwt = 'invalid_jwt';

    const result = testit(testJwt, accessTokenSchema, validDecodeConfig);
    return expect(result).rejects.toEqual(
      new Error('JWT verification failed. Error: jwt malformed')
    );
  });

  it('should fail to decode a jwt if payload does not satisfy the schema', () => {
    const invalidPayload = { ...validAccessTokenPayload, email: 123456, role: 'admin' };
    const result = buildJwt(
      invalidPayload,
      accessTokenSchema,
      validSubject,
      validEncodeConfig
    ).then((testJwt) => testit(testJwt.encoded, accessTokenSchema, validDecodeConfig));

    return expect(result).toRejectWithErrorContainingMessageParts([
      'JWT decoding failed. Error:',
      // eslint-disable-next-line no-useless-escape
      'Invalid literal value, expected \\\"user\\\"\"',
      'Expected string, received number'
    ]);
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

      const result = buildJwt(
        validAccessTokenPayload,
        accessTokenSchema,
        validSubject,
        encodeConfig
      ).then((testJwt) => testit(testJwt.encoded, accessTokenSchema, validDecodeConfig));
      return expect(result).rejects.toEqual(
        new Error(
          `JWT verification failed. Error: jwt ${jwtClaimKeyUnderTest} invalid. expected: ${expectedClaimValue}`
        )
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

      const result = buildJwt(
        validAccessTokenPayload,
        accessTokenSchema,
        validSubject,
        encodeConfig
      )
        .then((testJwt) => sleep(2000).then(() => testJwt))
        .then((testJwt) => testit(testJwt.encoded, accessTokenSchema, decodeConfig));
      return expect(result).rejects.toEqual(
        new Error(`JWT verification failed. Error: jwt expired`)
      );
    });
  });

  function testit(
    jwt: Jwt,
    schema: ZodSchema,
    config: DecodeAccessJwtConfig
  ): Promise<AccessToken> {
    return decodeAndVerifyJwtSignature(jwt, schema, config);
  }
});

describe('Jwt decoder without signature check', () => {
  it('should decode a jwt', () => {
    const result = buildJwt(
      validAccessTokenPayload,
      accessTokenSchema,
      validSubject,
      validEncodeConfig
    ).then((testJwt) => testit(testJwt.encoded, accessTokenSchema));
    return expect(result).resolves.toBeTruthy();
  });

  it('should fail to decode an invalid jwt', () => {
    const testJwt = 'invalid_jwt';

    const result = testit(testJwt, accessTokenSchema);
    return expect(result).rejects.toEqual(
      new Error(`JWT decoding failed. Most likely, the JWT was not a proper JSON`)
    );
  });

  it('should fail to decode a jwt if payload does not satisfy the schema', () => {
    const invalidPayload = { ...validAccessTokenPayload, email: 123456, role: 'admin' };
    const result = buildJwt(
      invalidPayload,
      accessTokenSchema,
      validSubject,
      validEncodeConfig
    ).then((testJwt) => testit(testJwt.encoded, accessTokenSchema));

    return expect(result).toRejectWithErrorContainingMessageParts([
      'JWT decoding failed. Error:',
      // eslint-disable-next-line no-useless-escape
      'Invalid literal value, expected \\\"user\\\"\"',
      'Expected string, received number'
    ]);
  });

  function testit(jwt: Jwt, schema: ZodSchema): Promise<AccessToken> {
    return decodeJwt(jwt, schema);
  }
});
