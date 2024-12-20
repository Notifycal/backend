import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { baseMiddleware } from '@common/lambda-middleware';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { z } from 'zod';
import { ApiGatewayV2Envelope } from '@aws-lambda-powertools/parser/envelopes';
import { ParsedResult } from '@aws-lambda-powertools/parser/types';
import middy from '@middy/core';
import { jwtVerificationMiddleware } from '@common/jwt-verification-middleware';
import { defaultDecodeJwtConfig } from './jwt';

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
  event: ParsedResult<APIGatewayProxyEventV2, TestingPayload>,
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
  ParsedResult<APIGatewayProxyEventV2, TestingPayload>,
  APIGatewayProxyStructuredResultV2,
  Error,
  Context
> = baseMiddleware()
  .use(jwtVerificationMiddleware(defaultDecodeJwtConfig, () => true))
  .use(
    parser({ schema: testingRequestEventSchema, envelope: ApiGatewayV2Envelope, safeParse: true })
  )
  .handler(lambdaHandler);
