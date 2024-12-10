import { describe, test, expect, jest } from '@jest/globals';
import { Context } from 'aws-lambda/handler';
import { LoginConfig } from './config';
import { handler, Payload } from '.';
import { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import * as googleOAuth from 'services/google-oauth';
import { email } from 'services/google-oauth';

describe('Login', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    // jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  it('should be ok', () => {
    const event = testEvent({
      'google-id-token': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as Payload;
    const idTokenVerificationResult = Promise.resolve('success@notifycal.com');
    return testit(event, idTokenVerificationResult).then(resp => {
      expect(resp.statusCode).toEqual(200);
      expect(resp.body).toEqual('OK');
      expect(resp.headers?.['Set-Authorization']).toBeTruthy();
      expect(resp.headers?.['Set-Refresh-Token']).toEqual("WIP");
    });
  });
  it('should fail id token verification', () => {
    const event = testEvent({
      'google-id-token': '<SOME-INCORRECT-GOOGLE-ID-TOKEN>'
    }) as unknown as Payload;
    const idTokenVerificationResult = Promise.reject('failure@notifycal.com');
    return testit(event, idTokenVerificationResult).then(resp => {
      expect(resp.statusCode).toEqual(401);
      expect(resp.body).toEqual('Unauthorised');
      expect(resp.headers?.['Set-Authorization']).toBeUndefined();
      expect(resp.headers?.['Set-Refresh-Token']).toBeUndefined();
    });
  });
  it('should fail input validation', () => {
    const event = unsafeTestEvent({
      'incorrect-field': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as Payload;
    const idTokenVerificationResult = Promise.resolve('success@notifycal.com');
    return testit(event, idTokenVerificationResult).then(resp => {
      expect(resp.statusCode).toEqual(401);
      expect(resp.body).toEqual('Unauthorised');
      expect(resp.headers?.['Set-Authorization']).toBeUndefined();
      expect(resp.headers?.['Set-Refresh-Token']).toBeUndefined();
    });
  });
  it('should fail to generate JWT', () => {
    const event = testEvent({
      'google-id-token': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as Payload;
    const idTokenVerificationResult = Promise.resolve('success@notifycal.com');
    return testit(event, idTokenVerificationResult, {...defaultEnv, privateKey: 'some wrong private key'}).then(resp => {
      expect(resp.statusCode).toEqual(500);
      expect(resp.body).toEqual('KO');
      expect(resp.headers?.['Set-Authorization']).toBeUndefined();
      expect(resp.headers?.['Set-Refresh-Token']).toBeUndefined();
    });
  });
});

function testit(event: any, idTokenVerificationResult: Promise<email>, env: LoginConfig = defaultEnv) {
  setEnv(env);
  jest.spyOn(googleOAuth, 'verifyGoogleToken').mockReturnValue(idTokenVerificationResult);
  return handler(event, c);
}
// openssl ecparam -name prime256v1 -genkey -noout -out private.ec.key
// openssl ec -in private.ec.key -pubout -out public.pem
// PUBLIC KEY
// -----BEGIN PUBLIC KEY-----
// MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5Ak
// bBnPn6rRLeuDhGwhClRkg5tp0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
// -----END PUBLIC KEY-----
const defaultEnv: LoginConfig = {
  privateKey: `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIEF6NI6CascYRtOFXEQrbsbsi7ZzTsKaktkDRZ/PSZ8hoAoGCCqGSM49
AwEHoUQDQgAEcLLFj6lOjORJHlCT4+2QrxNyq5AkbBnPn6rRLeuDhGwhClRkg5tp
0/r2oWst8tDiUNK9w3+3d7n8HGaP49b6WQ==
-----END EC PRIVATE KEY-----
`,
  jwt: {
    algorithm: 'ES256',
    issuer: 'test@notifycal.com',
    expiresIn: '5m'
  },
  googleClientId: '658640078137-omuaokg6rcajv50879674moielbpvljl.apps.googleusercontent.com'
}

function setEnv(config: LoginConfig) {
  process.env.JWT_PRIVATE_KEY = config.privateKey;
  process.env.JWT_ALGORITHM = config.jwt.algorithm;
  process.env.JWT_ISSUER = config.jwt.issuer;
  process.env.JWT_EXPIRATION = config.jwt.expiresIn;
  process.env.GOOGLE_CLIENT_ID = config.googleClientId;
  process.env.POWERTOOLS_DEV = "true";
}

function unsafeTestEvent(body: any): APIGatewayProxyEventV2 {
  return ttestEvent(JSON.stringify(body));
}

function testEvent(body: Payload): APIGatewayProxyEventV2 {
  return ttestEvent(JSON.stringify(body));
}

function ttestEvent(body: string): APIGatewayProxyEventV2 {
  return {
    body: body,
    version: "2.0",
    routeKey: "$default",
    rawPath: "/my/path",
    rawQueryString: "parameter1=value1&parameter1=value2&parameter2=value",
    cookies: [
      "cookie1"
    ],
    headers: {
      header1: "value1"
    },
    queryStringParameters: {
      parameter1: "value1,value2"
    },
    "requestContext": {
      accountId: "123456789012",
      apiId: "api-id",
      authentication: {
        clientCert: {
          clientCertPem: "CERT_CONTENT",
          subjectDN: "www.example.com",
          issuerDN: "Example issuer",
          serialNumber: "a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1",
          validity: {
            notBefore: "May 28 12:30:02 2019 GMT",
            notAfter: "Aug  5 09:36:04 2021 GMT"
          }
        }
      },
      authorizer: {
        jwt: {
          claims: {
            claim1: "value1"
          },
          scopes: [
            "scope1"
          ]
        }
      },
      domainName: "id.execute-api.us-east-1.amazonaws.com",
      domainPrefix: "id",
      http: {
        method: "POST",
        path: "/my/path",
        protocol: "HTTP/1.1",
        sourceIp: "192.0.2.1",
        userAgent: "agent"
      },
      requestId: "id",
      routeKey: "$default",
      stage: "$default",
      time: "12/Mar/2020:19:03:58 +0000",
      timeEpoch: 1583348638390
    },
    pathParameters: {
      parameter1: "value1"
    },
    isBase64Encoded: false,
    stageVariables: {
      stageVariable1: "value1"
    }
  };
}

const c: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "fnName",
  functionVersion: "test",
  invokedFunctionArn: "arn:test",
  memoryLimitInMB: "100mb",
  awsRequestId: "someId",
  logGroupName: "logGroupName",
  logStreamName: "logStreamName",
  getRemainingTimeInMillis: () => 1,
  done: () => {},
  fail: () => {},
  succeed: () => {}
}