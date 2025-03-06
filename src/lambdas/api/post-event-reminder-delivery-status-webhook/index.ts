import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { apiEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import type { z } from 'zod';
import {
  readReminderDeliveryStatusWebhookConfig,
  type ReminderDeliveryStatusWebhookConfig
} from './config';
import { successHandler } from '@services/common/api-response-handlers';
import { logger } from '@common/powertools';
import { VonageMessageStatusWebhookSchema } from '@model/vendor/vonage';

const schema = apiEventSchema<ReminderDeliveryStatusWebhookConfig>().extend({
  body: JSONStringified(VonageMessageStatusWebhookSchema)
});
export type Event = z.infer<typeof schema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  logger.info(`Processing API call in messaging-webhook lambda. Event: ${JSON.stringify(event)}`);
  const config = event.lambdaConfig;
  logger.info(`Config: ${JSON.stringify(config)}`);

  const { body } = event;
  logger.info(`Body: ${JSON.stringify(body)}`);

  logger.info(`QPS: ${JSON.stringify(event.queryStringParameters)}`);

  // Send whatever status update to audit-trail

  return Promise.resolve(successHandler()());
}

export const handler = unprotectedEndpointMiddleware(
  () => readReminderDeliveryStatusWebhookConfig(),
  schema
).handler<Event>(lambdaHandler);
