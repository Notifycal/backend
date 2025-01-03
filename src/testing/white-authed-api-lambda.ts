import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import type middy from '@middy/core';
import type { AuthedEndpointConfig } from '@model/Config';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { getDefaultDecodeAccessJwtConfig } from './utils/jwt';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { authedEventSchema } from '@model/ApiGatewayEvents';

export interface TestingWhiteApiConfig extends AuthedEndpointConfig {
  config1: string;
}
const eventSchema = authedEventSchema<TestingWhiteApiConfig>().extend({
  body: JSONStringified(
    z.object({
      'one-field': z.string()
    })
  )
});
type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): APIGatewayProxyResult {
  console.log(event);
  return {
    statusCode: 200,
    body: 'OK'
  };
}

function testingConfigReader(): TestingWhiteApiConfig {
  return {
    config1: 'blah',
    decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig()
  };
}

function claimChecker(): boolean {
  return true;
}

export const handler: middy.MiddyfiedHandler<
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Error,
  Context
> = protectedEndpointMiddleware(testingConfigReader, eventSchema, claimChecker).handler(
  lambdaHandler
);
