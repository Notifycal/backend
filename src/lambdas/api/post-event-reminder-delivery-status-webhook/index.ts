import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddlewareCustom } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { ActionableEventReminderStatusUpdatedEvent } from '@model/app-events/ActionableEventReminderStatusUpdatedEvent';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import {
  setupLoggerForAuthedVonageApiRequest,
  VonageMessageStatusWebhookSchema,
  type DecodeVonageAccessJwtConfig
} from '@model/vendor/vonage';
import type { DateTime, EventId } from '@notifycal/shared/types';
import { successHandler } from '@services/common/api-response-handlers';
import { vonageDecodeAndVerifyJwtSignature } from '@services/jwt';
import { SnsService } from '@services/sns';
import { tap } from '@utils/promises';
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

function rebuildActionableEventFoundEvent(
  queryParams: Record<string, string>,
  requestBody: Event['body']
): Promise<ActionableEventReminderStatusUpdatedEvent> {
  logger.info('Attempting to rebuild object from query string parameters', {
    queryParams
  });
  return queryStringObjectToTypedObject(queryParams, actionableEventQuerySchema)
    .then(
      tap((partialRebuiltEvent) => {
        logger.appendKeys({
          userId: partialRebuiltEvent.userId,
          idp: partialRebuiltEvent.idp,
          idpId: partialRebuiltEvent.idpId
        });
        logger.info('Rebuilt partial event', {
          rebuiltEventObject: partialRebuiltEvent
        });
      })
    )
    .then((partialRebuiltEvent) =>
      buildActionableEventReminderStatusUpdated(partialRebuiltEvent, requestBody)
    );
}

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  logger.info('Processing API call in messaging-webhook lambda', { event });
  const config = event.lambdaConfig;
  const snsService = SnsService.withConfig(config.messagingTopicConfig);

  return rebuildActionableEventFoundEvent(event.queryStringParameters || {}, event.body)
    .then((rebuiltEvent) => snsService.safePublish(rebuiltEvent))
    .then(
      () => successHandler()(),
      (err) => {
        logger.error(`Could not rebuild event from query string`, { error: err });
        return successHandler()();
      }
    );
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

const handler = protectedEndpointMiddlewareCustom(
  () => readReminderDeliveryStatusWebhookConfig(),
  schema,
  vonageAccessTokenSchema,
  vonageDecodeAndVerifyJwtSignature<typeof vonageAccessTokenSchema, DecodeVonageAccessJwtConfig>,
  vonageAccessTokenClaimChecker,
  enableCors,
  setupLoggerForAuthedVonageApiRequest
).handler<Event>(lambdaHandler);

module.exports = { handler };
