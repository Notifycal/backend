import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
<<<<<<< HEAD
import { protectedEndpointMiddlewareCustom, protectedEndpointMiddlewareCustom, webhookEndpointMiddleware } from '@common/lambda-middleware';
=======
import { protectedEndpointMiddlewareCustom } from '@common/lambda-middleware';
>>>>>>> 803bee1 (protect webhook by reusing the recently created middleware. A bit of refactoring around JwtConfig types to accomodate this feature)
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { CalendarEventReminderStatusUpdatedEvent } from '@model/app-events/CalendarEventReminderStatusUpdatedEvent';
import { apiEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { VonageMessageStatusWebhookSchema } from '@model/vendor/vonage';
import type { DateTime, EventId } from '@notifycal/shared/types';
import { AuditTrailService } from '@services/audit-trail';
import { successHandler } from '@services/common/api-response-handlers';
import { queryStringObjectToObject } from '@utils/queryString';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 } from 'uuid';
import { z } from 'zod';
import {
  readReminderDeliveryStatusWebhookConfig,
  type ReminderDeliveryStatusWebhookConfig
} from './config';

const schema = apiEventSchema<ReminderDeliveryStatusWebhookConfig>().extend({
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

const vonageAccessTokenSchema = z.object({
  header: z.object({}),
  payload: z.object({
    jti: z.string(),
    iat: z.number(),
    issuer: z.string()
  })
});

function vonageAccessTokenClaimChecker(
  jwt: z.infer<typeof vonageAccessTokenSchema>
): jwt is z.infer<typeof vonageAccessTokenSchema> {
  return jwt.payload.issuer === 'Vonage';
}

export const handler = protectedEndpointMiddlewareCustom(
  () => readReminderDeliveryStatusWebhookConfig(),
  schema,
  vonageAccessTokenSchema,
  vonageAccessTokenClaimChecker
).handler<Event>(lambdaHandler);
