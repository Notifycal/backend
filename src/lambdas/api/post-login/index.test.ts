import { describe, jest } from '@jest/globals';
import { LoginConfig } from './config';
import { handler } from './index';
import * as loginService from '@services/login';
import * as googleOAuth from '@services/google-oauth';
import * as jwt from '@services/jwt';
import { type APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { c, testEvent, unsafeTestEvent } from '@testing/apigateway';
import { User } from '@model/User';
import { Email } from '@own-types/model';
import { assert } from '@testing/utils/assertions';
import { setEnvAwsConfig, setEnvUserBaseStoreConfig } from '@testing/utils/config';
import { EncodeJwtConfig, EncodeRefreshJwtConfig } from '@model/Config';

describe('Login', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  const validJwts = {
    accessToken: 'some_valid_jwt',
    refreshToken: 'some_valid_jwt'
  };

  it('should sign up a user', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const jwtBuildFn = () => Promise.resolve(validJwts);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn).then((resp) => {
      assert(resp, {
        statusCode: 200,
        body: JSON.stringify({
          accessToken: validJwts.accessToken,
          tokenType: 'Bearer',
          refreshToken: validJwts.refreshToken
        })
      });
    });
  });

  it('should sign in a user', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const jwtBuildFn1 = () => Promise.resolve(validJwts);
    const validJwts2 = {
      accessToken: 'some_valid_jwt2',
      refreshToken: 'some_valid_jwt2'
    };
    const jwtBuildFn2 = () => Promise.resolve(validJwts2);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });

    return testit(event, idTokenVerificationFn, jwtBuildFn1, signInOrUpUserFn).then(() =>
      testit(event, idTokenVerificationFn, jwtBuildFn2, signInOrUpUserFn).then((resp) =>
        assert(resp, {
          statusCode: 200,
          body: JSON.stringify({
            accessToken: validJwts2.accessToken,
            tokenType: 'Bearer',
            refreshToken: validJwts2.refreshToken
          })
        })
      )
    );
  });

  it('should fail id token verification with 401', () => {
    const event = testEvent({
      'google-code': '<SOME-INCORRECT-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'failure@notifycal.com';
    const idTokenVerificationFn = () => Promise.reject(userEmail);
    const jwtBuildFn = () => Promise.resolve(validJwts);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn).then((resp) =>
      assert(resp, {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorised' })
      })
    );
  });

  it('should fail input validation with 400', () => {
    const event = unsafeTestEvent({
      'incorrect-field': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const jwtBuildFn = () => Promise.resolve(validJwts);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn).then((resp) =>
      assert(resp, {
        statusCode: 400,
        body: JSON.stringify({ message: 'Bad Request' }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
  });

  it('should fail to generate JWT with 500', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const jwtBuildFn = () => Promise.reject('Boooom!');
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn).then((resp) =>
      assert(resp, {
        statusCode: 500,
        body: JSON.stringify({ message: 'KO' })
      })
    );
  });

  it('should fail if environment is not set correctly with 500', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const jwtBuildFn = () => Promise.resolve(validJwts);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });
    const env = {
      ...defaultEnv,
      googleOAuthClient: {
        clientId: undefined as unknown as string
      }
    } as LoginConfig;

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn, env).then((resp) =>
      assert(resp, {
        statusCode: 500,
        body: JSON.stringify({ message: 'KO' }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
  });

  it('should fail if user cannot sign in or up with 500', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const jwtBuildFn = () => Promise.resolve(validJwts);
    const signInOrUpUserFn = () => Promise.reject('Error to sign in or up a user');

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn).then((resp) => {
      assert(resp, {
        statusCode: 500,
        body: JSON.stringify({ message: 'KO' })
      });
    });
  });
});

function testit(
  event: APIGatewayProxyEventV2,
  idTokenVerificationFn: () => Promise<Email>,
  jwtBuildsFn: () => Promise<jwt.EncodedJwts>,
  signInOrUpUserFn: () => Promise<User>,
  env: LoginConfig = defaultEnv
): Promise<APIGatewayProxyStructuredResultV2> {
  setEnv(env);
  jest.spyOn(googleOAuth, 'verifyGoogleIdentity').mockImplementation(idTokenVerificationFn);
  jest.spyOn(jwt, 'buildJwts').mockImplementation(jwtBuildsFn);
  jest.spyOn(loginService, 'signInOrUpUser').mockImplementation(signInOrUpUserFn);
  return handler(event, c);
}

const defaultEnv: LoginConfig = {
  encodeJwtConfig: {
    privateKey: `some_fake_private_key`,
    algorithm: 'ES256',
    issuer: 'test@notifycal.com',
    audience: 'test@notifycal.com',
    expiresIn: '5m'
  },
  encodeRefreshJwtConfig: {
    privateKey: `some_other_fake_private_key`,
    algorithm: 'ES256',
    issuer: 'test@notifycal.com',
    audience: 'test@notifycal.com',
    expiresIn: '7d'
  },
  googleOAuthClient: {
    clientId: '658640078137-omuaokg6rcajv50879674moielbpvljl.apps.googleusercontent.com',
    clientSecret: 'some_valid_secret',
    redirectUri: 'http://localhost:5173'
  },
  userBaseStore: {
    tableName: 'Users-local'
  },
  awsConfig: {
    awsRegion: 'eu-west-1'
  }
};

function setEnv(config: LoginConfig) {
  setEnvEncodeJwtConfig(config.encodeJwtConfig);
  setEnvEncodeRefreshJwtConfig(config.encodeRefreshJwtConfig);
  setEnvGoogleOAuthClientConfig(config.googleOAuthClient);
  setEnvUserBaseStoreConfig(config.userBaseStore);
  setEnvAwsConfig(config.awsConfig);
}

function setEnvEncodeJwtConfig(config: EncodeJwtConfig) {
  process.env.JWT_PRIVATE_KEY = config.privateKey;
  process.env.JWT_ALGORITHM = config.algorithm;
  process.env.JWT_ISSUER = config.issuer;
  process.env.JWT_AUDIENCE = config.audience;
  process.env.JWT_EXPIRATION = config.expiresIn;
}

function setEnvEncodeRefreshJwtConfig(config: EncodeRefreshJwtConfig) {
  process.env.REFRESH_JWT_PRIVATE_KEY = config.privateKey;
  process.env.REFRESH_JWT_ALGORITHM = config.algorithm;
  process.env.REFRESH_JWT_ISSUER = config.issuer;
  process.env.REFRESH_JWT_AUDIENCE = config.audience;
  process.env.REFRESH_JWT_EXPIRATION = config.expiresIn;
}

function setEnvGoogleOAuthClientConfig(config: googleOAuth.GoogleOAuthConfig) {
  process.env.GOOGLE_OAUTH_CLIENT_ID = config.clientId;
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = config.clientSecret;
  process.env.GOOGLE_OAUTH_CLIENT_REDIRECT_URI = config.redirectUri;
}
