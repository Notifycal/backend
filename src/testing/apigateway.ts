import type { Context } from 'aws-lambda/handler';
import type { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import {
  getDefaultAccessTokenPayload,
  getDefaultEncodeAccessJwtConfig,
  testJwt
} from './utils/jwt';
import type { EncodeAccessJwtConfig } from '@model/Config';
import { type OurAccessTokenClaims, accessTokenSchema } from '@model/Jwt';
import type { ZodSchema } from 'zod';

function ttestEvent(body: string, headers: Record<string, string> = {}): APIGatewayProxyEventV2 {
  return {
    body: body,
    version: '2.0',
    routeKey: '$default',
    rawPath: '/my/path',
    rawQueryString: 'parameter1=value1&parameter1=value2&parameter2=value',
    cookies: ['cookie1'],
    headers: headers,
    queryStringParameters: {
      parameter1: 'value1,value2'
    },
    requestContext: {
      accountId: '123456789012',
      apiId: 'api-id',
      authentication: {
        clientCert: {
          clientCertPem: 'CERT_CONTENT',
          subjectDN: 'www.example.com',
          issuerDN: 'Example issuer',
          serialNumber: 'a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1',
          validity: {
            notBefore: 'May 28 12:30:02 2019 GMT',
            notAfter: 'Aug  5 09:36:04 2021 GMT'
          }
        }
      },
      authorizer: {
        jwt: {
          claims: {
            claim1: 'value1'
          },
          scopes: ['scope1']
        }
      },
      domainName: 'id.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'id',
      http: {
        method: 'POST',
        path: '/my/path',
        protocol: 'HTTP/1.1',
        sourceIp: '192.0.2.1',
        userAgent: 'agent'
      },
      requestId: 'id',
      routeKey: '$default',
      stage: '$default',
      time: '12/Mar/2020:19:03:58 +0000',
      timeEpoch: 1583348638390
    },
    pathParameters: {
      parameter1: 'value1'
    },
    isBase64Encoded: false,
    stageVariables: {
      stageVariable1: 'value1'
    }
  };
}

export function unsafeTestEvent(
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ /* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types */
  body: any,
  headers: Record<string, string> = {}
): APIGatewayProxyEventV2 {
  return ttestEvent(JSON.stringify(body), headers);
}

export function testEvent<T>(
  body: T,
  headers: Record<string, string> = {}
): APIGatewayProxyEventV2 {
  return ttestEvent(JSON.stringify(body), headers);
}

export function testAuthedEvent<T>(
  body: T,
  headers: Record<string, string> = {},
  jwtPayload: OurAccessTokenClaims = getDefaultAccessTokenPayload(),
  jwtSchema: ZodSchema = accessTokenSchema,
  encodeJwtConfig: EncodeAccessJwtConfig = getDefaultEncodeAccessJwtConfig()
): Promise<APIGatewayProxyEventV2> {
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
