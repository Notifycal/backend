import { describe, test, expect, jest } from '@jest/globals';
import { APIGatewayProxyEvent } from 'aws-lambda/trigger/api-gateway-proxy';
import { Context } from 'aws-lambda/handler';
import { LoginConfig } from './config';
import { handler } from '.';

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

  test('should be ok', () => {
    const event = testEvent(JSON.stringify({
      'google-id-token': 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImEzYjc2MmY4NzFjZGIzYmFlMDA0NGM2NDk2MjJmYzEzOTZlZGEzZTMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI2NTg2NDAwNzgxMzctb211YW9rZzZyY2FqdjUwODc5Njc0bW9pZWxicHZsamwuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI2NTg2NDAwNzgxMzctb211YW9rZzZyY2FqdjUwODc5Njc0bW9pZWxicHZsamwuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDAxOTE3Nzk1ODg2MTAyNzE4NzEiLCJlbWFpbCI6InNlcmdpby5hbmdlckBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmJmIjoxNzE1NTU1OTA0LCJuYW1lIjoiU2VyZ2lvIE1hcnTDrW4gU8OhbmNoZXoiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS2Q5S1lnTjIwdUxQZlV6MW5KUDJQS3BtNjRBd1VITVJIUjRVYnM0MXM2cnVJWW1RPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IlNlcmdpbyIsImZhbWlseV9uYW1lIjoiTWFydMOtbiBTw6FuY2hleiIsImlhdCI6MTcxNTU1NjIwNCwiZXhwIjoxNzE1NTU5ODA0LCJqdGkiOiJjYjc5YjU4ZjU4M2RjMzhjYzAwZDBhMjhhODUwYmZhOGQ3NTZlNDVmIn0.HvTYegUoRgDx_qbUV48g2l9f8VE2kSYEEMCp7DAmDjxvLn_JOZTPDkP6lGM5sNnzrq2zYiSpkSwvzChIldlgeOFMwPGl209BqljN2g_5XnoBT92dDbjmX0N1-NZm6b3MRcXtCuGRJiy2S91FgUUeag_4PB7QcHztaFjlDuLSg3u5KqjvvuGJF7E1YCZn7SZm0wH9MkKVLP0suJvfpAmeWufAU7f6GwQjxs2IdD4DOdc0n_PykbYZX-YHntCUu89thfMuqj1trszW9dDw0YD3TxGjt_COgXyBEBFeVdB2kYgUF0iwihVQo_yeQfrjD9Am_wxs0yYuGKXRYg_LXcDMwg'
    }));
    return testit(event).then(resp => {
      expect(resp.statusCode).toEqual(200);
      expect(resp.body).toEqual(null);
      expect(resp.headers?.['Set-Authorization']).toBeTruthy();
      expect(resp.headers?.['Set-Refresh-Token']).toEqual("WIP");
    });
  });
  test('should fail validation', () => {
    const event = testEvent(JSON.stringify({
      'google-id-token': 999
    }));
    return testit(event).then(resp => {
      expect(resp.statusCode).toEqual(401);
      expect(resp.body).toEqual('');
      expect(resp.headers?.['Set-Authorization']).toBeUndefined();
      expect(resp.headers?.['Set-Refresh-Token']).toBeUndefined();
    });
  });
});

function testit(event: APIGatewayProxyEvent, env: LoginConfig = defaultEnv) {
  setEnv(env);
  return handler(event, c);
}
// ssh-keygen -t ed25519
// const publicKey = `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIO8XdoQm3Cg82JrbOLiouT/GFhQ+xfSFyjeyXdzSFzZU sj11@sj11box`
const defaultEnv: LoginConfig = {
  privateKey: `-----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
  QyNTUxOQAAACDvF3aEJtwoPNia2zi4qLk/xhYUPsX0hco3sl3c0hc2VAAAAJCXcQmQl3EJ
  kAAAAAtzc2gtZWQyNTUxOQAAACDvF3aEJtwoPNia2zi4qLk/xhYUPsX0hco3sl3c0hc2VA
  AAAEAVNTEhqnEQAFQB21EoM6Ebh+k9tOSsoowg+1tNLHKdQe8XdoQm3Cg82JrbOLiouT/G
  FhQ+xfSFyjeyXdzSFzZUAAAADHNqMTFAc2oxMWJveAE=
  -----END OPENSSH PRIVATE KEY-----`,
  jwt: {
    algorithm: 'ES256',
    issuer: 'test@notifycal.com',
    expiresIn: '5m'
  },
  googleClientId: 'testing.google.com'
}

function setEnv(config: LoginConfig) {
  process.env.JWT_PRIVATE_KEY = config.privateKey;
  process.env.JWT_ALGORITHM = config.jwt.algorithm;
  process.env.JWT_ISSUER = config.jwt.issuer;
  process.env.JWT_EXPIRATION = config.jwt.expiresIn;
  process.env.GOOGLE_CLIENT_ID = config.googleClientId;
  process.env.POWERTOOLS_DEV = "true";
}

function testEvent(body: string | null): APIGatewayProxyEvent {
  return {
    body: body,
    resource: 'someResource',
    path: 'somePath',
    httpMethod: 'POST',
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    requestContext: {
      accountId: 'someAccountId',
      apiId: 'someApiId',
      stage: 'someStage',
      protocol: 'someProtocol',
      identity: {},
      requestId: 'someRequestId',
      requestTime: 'someRequestTime',
      requestTimeEpoch: 123456789,
      resourcePath: 'someResourcePath',
      httpMethod: 'POST',
      path: 'somePath2'
    }
  } as APIGatewayProxyEvent;
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