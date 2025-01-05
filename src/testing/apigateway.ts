import type { Context } from 'aws-lambda/handler';
import type { APIGatewayProxyEvent } from '@aws-lambda-powertools/parser/types';
import {
  getDefaultAccessTokenPayload,
  getDefaultEncodeAccessJwtConfig,
  testJwt
} from './utils/jwt';
import type { EncodeAccessJwtConfig } from '@model/Config';
import { type OurAccessTokenClaims, accessTokenSchema } from '@model/Jwt';
import type { ZodSchema } from 'zod';

function ttestEvent(body: string, headers: Record<string, string> = {}): APIGatewayProxyEvent {
  return {
    body: body,
    resource: '/my/path',
    path: '/my/path',
    httpMethod: 'GET',
    headers: headers,
    multiValueHeaders: {
      header1: ['value1'],
      header2: ['value1', 'value2']
    },
    queryStringParameters: {
      parameter1: 'value1',
      parameter2: 'value'
    },
    multiValueQueryStringParameters: {
      parameter1: ['value1', 'value2'],
      parameter2: ['value']
    },
    requestContext: {
      accountId: '123456789012',
      apiId: 'id',
      authorizer: {
        claims: {},
        scopes: []
      },
      domainName: 'id.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'id',
      extendedRequestId: 'request-id',
      httpMethod: 'GET',
      identity: {
        accessKey: null,
        accountId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '192.0.2.1',
        user: null,
        userAgent: 'user-agent',
        userArn: null,
        clientCert: {
          clientCertPem: 'CERT_CONTENT',
          subjectDN: 'www.example.com',
          issuerDN: 'Example issuer',
          serialNumber: 'a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1',
          validity: {
            notBefore: 'May 28 12:30:02 2019 GMT',
            notAfter: 'Aug 5 09:36:04 2021 GMT'
          }
        }
      },
      path: '/my/path',
      protocol: 'HTTP/1.1',
      requestId: 'id=',
      requestTime: '04/Mar/2020:19:15:17 +0000',
      requestTimeEpoch: 1583349317135,
      resourceId: null,
      resourcePath: '/my/path',
      stage: '$default'
    },
    pathParameters: null,
    stageVariables: null,
    isBase64Encoded: false
  };
}

export function unsafeTestEvent(
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ /* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types */
  body: any,
  headers: Record<string, string> = {}
): APIGatewayProxyEvent {
  return ttestEvent(JSON.stringify(body), headers);
}

export function testEvent<T>(body: T, headers: Record<string, string> = {}): APIGatewayProxyEvent {
  return ttestEvent(JSON.stringify(body), headers);
}

export function testAuthedEvent<T>(
  body: T,
  headers: Record<string, string> = {},
  jwtPayload: OurAccessTokenClaims = getDefaultAccessTokenPayload(),
  jwtSchema: ZodSchema = accessTokenSchema,
  encodeJwtConfig: EncodeAccessJwtConfig = getDefaultEncodeAccessJwtConfig()
): Promise<APIGatewayProxyEvent> {
  return testJwt(jwtPayload, jwtSchema, encodeJwtConfig).then((jwt) =>
    ttestEvent(JSON.stringify(body), { ...headers, Authorization: `Bearer ${jwt}` })
  );
}

export const c: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'fnName',
  functionVersion: 'test',
  invokedFunctionArn: 'arn:test',
  memoryLimitInMB: '100mb',
  awsRequestId: 'someId',
  logGroupName: 'logGroupName',
  logStreamName: 'logStreamName',
  getRemainingTimeInMillis: () => 1,

  done: () => {},

  fail: () => {},

  succeed: () => {}
};
