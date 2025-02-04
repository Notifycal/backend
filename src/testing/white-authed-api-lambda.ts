import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import type { AuthedEndpointConfig } from '@model/Config';
import { responseSuccess } from '@services/common/api-response-handlers';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { getDefaultDecodeAccessJwtConfig } from './utils/jwt';

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
export type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): APIGatewayProxyResult {
  console.log(event);
  return responseSuccess({ result: { afield: 'OK' } });
}

function testingConfigReader(): TestingWhiteApiConfig {
  return {
    config1: 'blah',
    decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
    baseConfig: {
      frontendDomain: 'http://localhost:5173'
    }
  };
}

function claimChecker(): boolean {
  return true;
}

export const handler = protectedEndpointMiddleware(
  testingConfigReader,
  eventSchema,
  claimChecker
).handler<Event>(lambdaHandler);
