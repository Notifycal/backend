import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { CalendarEventReminderStatusUpdatedEvent } from '@model/app-events/CalendarEventReminderStatusUpdatedEvent';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import {
  type DecodeVonageAccessJwtConfig,
  VonageMessageStatusWebhookSchema
} from '@model/vendor/vonage';
import type { DateTime, EventId } from '@notifycal/shared/types';
import { AuditTrailService } from '@services/audit-trail';
import { successHandler } from '@services/common/api-response-handlers';
import { vonageDecodeAndVerifyJwtSignature } from '@services/jwt';
import { queryStringObjectToObject } from '@utils/queryString';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 } from 'uuid';
import type { z } from 'zod';
import {
  readReminderDeliveryStatusWebhookConfig,
  type ReminderDeliveryStatusWebhookConfig
} from './config';
import { vonageAccessTokenSchema } from './schema';

const schema = authedEventSchema<ReminderDeliveryStatusWebhookConfig>().extend({
  body: JSONStringified(VonageMessageStatusWebhookSchema)
});
export type Event = z.infer<typeof schema>;

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  logger.info('Processing API call in messaging-webhook lambda', { event });
  const config = event.lambdaConfig;
  logger.info('Config', { config });

  const { body } = event;
  logger.info('Body', { body });

  const queryStringParameterObject = event.queryStringParameters || {};
  logger.info('Rebuild object from query string parameters', {
    queryStringParameterObject
  });

  const rebuiltEventObject = queryStringObjectToObject<
    Omit<ActionableEventFoundEvent, 'eventType' | 'eventId' | 'happenedAt'>
  >(queryStringParameterObject);

  logger.info('Rebuilt object', {
    rebuiltEventObject
  });

  const auditTrailService = AuditTrailService.withConfig(config.auditTrailQueueConfig);
  try {
    await auditTrailService.send<CalendarEventReminderStatusUpdatedEvent>({
      ...rebuiltEventObject,
      eventType: 'CalendarEventReminderStatusUpdated',
      eventId: v4() as EventId,
      happenedAt: new Date().toISOString() as DateTime,
      data: {
        ...rebuiltEventObject.data,
        messageUUID: body.message_uuid,
        messageStatusPayload: {
          ...body
        }
      }
    });
    logger.info(
      `Message status update sent to audit trail. correlationId: ${rebuiltEventObject.correlationId}`
    );
  } catch (err) {
    logger.error(
      `Could not send message status update to audit trail. correlationId: ${rebuiltEventObject.correlationId}. Cause: ${JSON.stringify(err)}`
    );
  }

  return Promise.resolve(successHandler()());
}

function vonageAccessTokenClaimChecker(
  jwt: z.infer<typeof vonageAccessTokenSchema>,
  config: ReminderDeliveryStatusWebhookConfig
): jwt is z.infer<typeof vonageAccessTokenSchema> {
  return (
    jwt.payload.iss === config.decodeAccessJwtConfig.issuer &&
    jwt.payload.application_id === config.decodeAccessJwtConfig.applicationId &&
    jwt.payload.api_key === config.decodeAccessJwtConfig.apiKey
  );
}
const enableCors = false;

export const handler = protectedEndpointMiddleware(
  () => readReminderDeliveryStatusWebhookConfig(),
  schema,
  vonageAccessTokenSchema,
  vonageDecodeAndVerifyJwtSignature<typeof vonageAccessTokenSchema, DecodeVonageAccessJwtConfig>,
  vonageAccessTokenClaimChecker,
  enableCors
).handler<Event>(lambdaHandler);
