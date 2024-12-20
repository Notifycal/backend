import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { baseMiddleware } from '@common/lambda-middleware';
import { z } from 'zod';
import middy from '@middy/core';
import { jwtVerificationMiddleware } from '@common/jwt-verification-middleware';
import { getDefaultDecodeJwtConfig } from './utils/jwt';
import { httpRequestPayloadParserMiddleware } from '@common/parser-http-middleware';

const testingReqFieldName = 'one-field';
const testingRequestEventSchema = z.object({
  [testingReqFieldName]: z.string()
});
type TestingPayload = z.infer<typeof testingRequestEventSchema>;
export { testingRequestEventSchema, type TestingPayload };

export interface TestingWhiteApiConfig {
  publicKey: string;
}

async function lambdaHandler(
  event: TestingPayload,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  console.log(event);
  return {
    statusCode: 200,
    body: 'OK'
  };
}

export const handler: middy.MiddyfiedHandler<
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Error,
  Context
> = baseMiddleware()
  .use(jwtVerificationMiddleware(getDefaultDecodeJwtConfig(), claimChecker))
  .use(httpRequestPayloadParserMiddleware(testingRequestEventSchema))
  .handler(lambdaHandler);

function claimChecker(): boolean {
  return true;
}
