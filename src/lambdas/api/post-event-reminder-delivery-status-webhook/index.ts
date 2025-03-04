import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { apiEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import {
  readReminderDeliveryStatusWebhookConfig,
  type ReminderDeliveryStatusWebhookConfig
} from './config';
import { successHandler } from '@services/common/api-response-handlers';
import { uuidSchema } from '@notifycal/shared/schemas';
import { logger } from '@common/powertools';

export const bodySchema = z.object({
  messageUUID: uuidSchema
});

const schema = apiEventSchema<ReminderDeliveryStatusWebhookConfig>().extend({
  body: JSONStringified(bodySchema)
});
export type Event = z.infer<typeof schema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  logger.info(`Processing API call in messaging-webhook lambda. Event: ${JSON.stringify(event)}`);
  const config = event.lambdaConfig;
  console.log(config);

  return Promise.resolve(successHandler()());
}

export const handler = unprotectedEndpointMiddleware(
  () => readReminderDeliveryStatusWebhookConfig(),
  schema
).handler<Event>(lambdaHandler);
