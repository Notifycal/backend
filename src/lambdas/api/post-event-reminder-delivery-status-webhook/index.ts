import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddlewareCustom } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { ActionableEventReminderStatusUpdatedEvent } from '@model/app-events/ActionableEventReminderStatusUpdatedEvent';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import {
  VonageMessageStatusWebhookSchema,
  type DecodeVonageAccessJwtConfig
} from '@model/vendor/vonage';
import type { DateTime, EventId } from '@notifycal/shared/types';
import { AuditTrailService } from '@services/audit-trail';
import { successHandler } from '@services/common/api-response-handlers';
import { vonageDecodeAndVerifyJwtSignature } from '@services/jwt';
import { queryStringObjectToTypedObject } from '@utils/queryString';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 } from 'uuid';
import type { z } from 'zod';
import {
  readReminderDeliveryStatusWebhookConfig,
  type ReminderDeliveryStatusWebhookConfig
} from './config';
import { actionableEventQuerySchema, vonageAccessTokenSchema } from './schema';

const schema = authedEventSchema<ReminderDeliveryStatusWebhookConfig>().extend({
  body: JSONStringified(VonageMessageStatusWebhookSchema)
});
export type Event = z.infer<typeof schema>;

function buildActionableEventReminderStatusUpdated(
  rebuiltEventObject: Omit<ActionableEventFoundEvent, 'eventType' | 'eventId' | 'happenedAt'>,
  event: Event['body']
): ActionableEventReminderStatusUpdatedEvent {
  return {
    ...rebuiltEventObject,
    eventType: 'ActionableEventReminderStatusUpdated',
    eventId: v4() as EventId,
    happenedAt: new Date().toISOString() as DateTime,
    data: {
      ...rebuiltEventObject.data,
      messageUUID: event.message_uuid,
      messageStatusPayload: {
        ...event
      }
    }
  };
}

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  logger.info('Processing API call in messaging-webhook lambda', { event });
  const config = event.lambdaConfig;

  const queryStringParameterObject = event.queryStringParameters || {};
  logger.info('Attempting to rebuild object from query string parameters', {
    queryStringParameterObject
  });

  const auditTrailService = AuditTrailService.withConfig(config.auditTrailQueueConfig);
  let rebuiltEventObject: Omit<ActionableEventFoundEvent, 'eventType' | 'eventId' | 'happenedAt'>;

  try {
    rebuiltEventObject = queryStringObjectToTypedObject(
      queryStringParameterObject,
      actionableEventQuerySchema
    );

    logger.info('Rebuilt object', {
      rebuiltEventObject
    });
  } catch (err) {
    logger.error(`Could not rebuild event from query string`, { error: err });
    return Promise.resolve(successHandler()());
  }
  await auditTrailService.safeSend(
    buildActionableEventReminderStatusUpdated(rebuiltEventObject, event.body)
  );

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

export const handler = protectedEndpointMiddlewareCustom(
  () => readReminderDeliveryStatusWebhookConfig(),
  schema,
  vonageAccessTokenSchema,
  vonageDecodeAndVerifyJwtSignature<typeof vonageAccessTokenSchema, DecodeVonageAccessJwtConfig>,
  vonageAccessTokenClaimChecker,
  enableCors
).handler<Event>(lambdaHandler);
