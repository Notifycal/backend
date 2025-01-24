import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { type GetUserCalendarListConfig, readGetUserCalendarListConfig } from './config';
import { authedEventSchema } from '@model/ApiGatewayEvents';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import type { z } from 'zod';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import { calendarList } from '@services/calendar';

const eventSchema = authedEventSchema<GetUserCalendarListConfig>();
export type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.endpointConfig;
  const userId = event.requestContext.authorizer.payload.userId;
  const idp = event.requestContext.authorizer.payload.idp;
  return calendarList(userId, idp, config.idpConfigs, config.userBaseStoreConfig).then(
    (calendars) => successHandler()(calendars),
    errorHandler(500)
  );
}

export const handler = protectedEndpointMiddleware(
  () => readGetUserCalendarListConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
