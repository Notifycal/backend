import type {
  Algorithm,
  DecodeAccessJwtConfig,
  Duration,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import { type AccessToken, accessTokenSchema } from '@model/Jwt';
import type { Email, Identity, IdpId, IdpName, Jwt, Uuid } from '@notifycal/shared/types';
import type { PublicKey } from '@own-types/model';
import { sleep } from '@testing/utils/utils';
import { describe, expect, it } from 'vitest';
import type { ZodSchema } from 'zod';
import {
  type EncodedAndDecodedJwt,
  type EncodedAndDecodedJwts,
  buildJwt,
  buildJwts,
  decodeAndVerifyJwtSignature,
  decodeJwt
} from './jwt';

const validPrivateKey = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIEF6NI6CascYRtOFXEQrbsbsi7ZzTsKaktkDRZ/PSZ8hoAoGCCqGSM49
AwEHoUQDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5AkbBnPn6rRLeuDhGwhClRkg5tp
0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
-----END EC PRIVATE KEY-----`;
const validPublicKey = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5Ak
bBnPn6rRLeuDhGwhClRkg5tp0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
-----END PUBLIC KEY-----` as PublicKey;

const validIssuer = 'issuer.notifycal.com';
const validAudience = 'api.notifycal.com';

const validEncodeConfig = {
  privateKey: validPrivateKey,
  algorithm: 'ES256' as Algorithm,
  issuer: validIssuer,
  audience: validAudience,
  expiresIn: '5m' as Duration
};
const validDecodeConfig = {
  publicKey: validPublicKey,
  expiresIn: '5m' as Duration,
  issuer: validIssuer,
  audience: validAudience
};
const validSubject = '09b6b481-3fa1-4ed4-b3c1-5a9467acc7ef' as Uuid;
const validEmail = 'test@notifycal.com' as Email;
const validAccessTokenPayload = {
  userId: validSubject,
  email: validEmail,
  idp: 'google.com',
  idpId: '3625462456246' as IdpId,
  role: 'user',
  permissions: {}
};

describe('Jwt builder', () => {
  it('should build a jwt', () => {
    return expect(testit(validAccessTokenPayload, validEncodeConfig)).resolves.toStrictEqual(
      expect.any(Object)
    );
  });

  it('should fail to build a jwt', () => {
    const config = {
      ...validEncodeConfig,
      privateKey: `invalid_es256_private_key`
    };
    return expect(testit(validAccessTokenPayload, config)).rejects.toStrictEqual(
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
  const userId = '09b6b481-3fa1-4ed4-b3c1-5a9467acc7ef' as Uuid;
  const email = 'test@notifycal.com' as Email;
  const identity = {
    userId: userId,
    email: email,
    idp: 'google.com' as IdpName,
    idpId: '46345747457457' as IdpId
  };

  it('should build a jwts', () => {
    return expect(testit(identity, validEncodeConfig, validEncodeConfig)).resolves.toStrictEqual(
      expect.any(Object)
    );
  });

  it('should fail to build access jwt', () => {
    const invalidEncodeJwtConfig = {
      ...validEncodeConfig,
      privateKey: `invalid_es256_private_key`
    };
    return expect(
      testit(identity, invalidEncodeJwtConfig, validEncodeConfig)
    ).rejects.toStrictEqual(
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
      testit(identity, validEncodeConfig, invalidEncodeRefreshJwtConfig)
    ).rejects.toStrictEqual(
      new Error(
        'Refresh JWT could not be generated. Error: secretOrPrivateKey must be an asymmetric key when using ES256'
      )
    );
  });

  function testit(
    identity: Identity<IdpName>,
    encodeJwtConfig: EncodeAccessJwtConfig,
    encodeRefreshJwtConfig: EncodeRefreshJwtConfig
  ): Promise<EncodedAndDecodedJwts> {
    return buildJwts(identity, encodeJwtConfig, encodeRefreshJwtConfig);
  }
});

describe('Jwt decoder/verifier with signature', () => {
  it('should verify a jwt - it ignores subject claim', () => {
    const result = buildJwt(
      validAccessTokenPayload,
      accessTokenSchema,
      validSubject,
      validEncodeConfig
    ).then((testJwt) => testit(testJwt.encoded, validDecodeConfig));
    return expect(result).resolves.toStrictEqual(expect.any(Object));
  });

  it('should fail to verify a jwt when public key is invalid', () => {
    const decodeConfig = {
      ...validDecodeConfig,
      publicKey: `INVALID_PUBLIC_KEY` as PublicKey
    };

    const result = buildJwt(
      validAccessTokenPayload,
      accessTokenSchema,
      validSubject,
      validEncodeConfig
    ).then((testJwt) => testit(testJwt.encoded, decodeConfig));
    return expect(result).rejects.toStrictEqual(
      new Error('JWT verification failed. Error: invalid algorithm')
    );
  });

  it('should fail to verify a jwt when jwt is invalid', () => {
    const testJwt = 'invalid_jwt' as Jwt;

    const result = testit(testJwt, validDecodeConfig);
    return expect(result).rejects.toStrictEqual(
      new Error('JWT verification failed. Error: jwt malformed')
    );
  });

  it('should fail to decode a jwt if payload does not satisfy the schema', () => {
    const invalidPayload = { ...validAccessTokenPayload, userId: 'not an uuid', role: 'admin' };
    const result = buildJwt(
      invalidPayload,
      accessTokenSchema,
      validSubject,
      validEncodeConfig
    ).then((testJwt) => testit(testJwt.encoded, validDecodeConfig));

    return expect(result).toRejectWithErrorContainingMessageParts([
      'JWT decoding failed. Error:',
      // eslint-disable-next-line no-useless-escape
      'Invalid literal value, expected \\\"user\\\"\"',
      'Invalid uuid'
    ]);
  });

  // eslint-disable-next-line vitest/require-hook
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
      ).then((testJwt) => testit(testJwt.encoded, validDecodeConfig));
      return expect(result).rejects.toStrictEqual(
        new Error(
          `JWT verification failed. Error: jwt ${jwtClaimKeyUnderTest} invalid. expected: ${expectedClaimValue}`
        )
      );
    });

    it(`should fail to verify a an expired jwt`, async () => {
      const encodeConfig = {
        ...validEncodeConfig,
        expiresIn: '1s' as Duration
      };
      const decodeConfig = {
        ...validDecodeConfig,
        maxAge: '1s' as Duration
      };

      const result = buildJwt(
        validAccessTokenPayload,
        accessTokenSchema,
        validSubject,
        encodeConfig
      )
        .then((testJwt) => sleep(2000).then(() => testJwt))
        .then((testJwt) => testit(testJwt.encoded, decodeConfig));
      return expect(result).rejects.toStrictEqual(
        new Error(`JWT verification failed. Error: jwt expired`)
      );
    });
  });

  function testit(jwt: Jwt, config: DecodeAccessJwtConfig): Promise<AccessToken> {
    return decodeAndVerifyJwtSignature<typeof accessTokenSchema>(jwt, accessTokenSchema, config);
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
    return expect(result).resolves.toStrictEqual(expect.any(Object));
  });

  it('should fail to decode an invalid jwt', () => {
    const testJwt = 'invalid_jwt' as Jwt;

    const result = testit(testJwt, accessTokenSchema);
    return expect(result).rejects.toStrictEqual(
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
      'admin'
    ]);
  });

  function testit(jwt: Jwt, schema: ZodSchema): Promise<AccessToken> {
    return decodeJwt(jwt, schema);
  }
});
