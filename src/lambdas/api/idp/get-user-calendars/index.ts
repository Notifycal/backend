import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { calendarList } from '@services/calendar';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import type { z } from 'zod';
import { type GetUserCalendarsConfig, readGetUserCalendarListConfig } from './config';

const eventSchema = authedEventSchema<GetUserCalendarsConfig>();
export type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.lambdaConfig;
  const userId = event.requestContext.authorizer.payload.userId;
  const idp = event.requestContext.authorizer.payload.idp;
  return calendarList(userId, idp, config.idpConfigs, config.userBaseStoreConfig).then(
    (calendars) => successHandler()({ result: calendars }),
    errorHandler(500)
  );
}

export const handler = protectedEndpointMiddleware(
  () => readGetUserCalendarListConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
