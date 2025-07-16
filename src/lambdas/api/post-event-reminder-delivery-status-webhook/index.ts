import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddlewareCustom } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { ActionableEventReminderStatusUpdatedEvent } from '@model/app-events/ActionableEventReminderStatusUpdatedEvent';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import type { DemoReminderToBeSentStatusUpdatedEvent } from '@model/app-events/DemoReminderToBeSentStatusUpdatedEvent';
import type {
  CreditAdditionResult,
  CreditDeductionResult,
  DemoCounterDecrementResult,
  DemoCounterIncrementResult
} from '@model/Credits';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import type { DecodeVonageAccessJwtConfig } from '@model/vendor/vonage/config';
import {
  setupLoggerForAuthedVonageApiRequest,
  vonageAccessTokenSchema,
  vonageWebhookMessageStatusPayloadSchema,
  type VonageWebhookMessageStatusPayload
} from '@model/vendor/vonage/schemas';
import type { DateTime, EventId } from '@notifycal/shared/types';
import { successHandler } from '@services/common/api-response-handlers';
import { rejectWithMessageAndError } from '@services/common/error-handling';
import { CreditAdjustmentService } from '@services/credit-adjustment-service';
import { CreditsService } from '@services/credits-service';
import { vonageDecodeAndVerifyJwtSignature } from '@services/jwt';
import { SnsService } from '@services/sns';
import { UserBaseStore } from '@services/stores/user-base-store';
import { tap } from '@utils/promises';
import { queryStringObjectToTypedObject } from '@utils/queryString';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { match } from 'ts-pattern';
import { v4 } from 'uuid';
import type { z } from 'zod';
import {
  readReminderDeliveryStatusWebhookConfig,
  type ReminderDeliveryStatusWebhookConfig
} from './config';
import { webhookCorrelationDataSchema, type WebhookCorrelationData } from './schema';

const schema = authedEventSchema<ReminderDeliveryStatusWebhookConfig>().extend({
  body: JSONStringified(vonageWebhookMessageStatusPayloadSchema)
});
export type Event = z.infer<typeof schema>;

function buildActionableEventReminderStatusUpdated(
  rebuiltEventObject: Omit<ActionableEventFoundEvent, 'eventType' | 'eventId' | 'happenedAt'>,
  event: VonageWebhookMessageStatusPayload,
  creditDeductionResult: CreditDeductionResult<'deduct'>,
  creditRestoreResult?: CreditAdditionResult<'restore'>
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
      },
      creditDeductionResult,
      creditRestoreResult
    }
  };
}

function buildDemoReminderToBeSentReminderStatusUpdated(
  rebuiltEventObject: Omit<DemoReminderToBeSentEvent, 'eventId' | 'happenedAt'>,
  event: VonageWebhookMessageStatusPayload,
  demoCounterIncrementResult: DemoCounterIncrementResult,
  demoCounterDecrementResult?: DemoCounterDecrementResult
): DemoReminderToBeSentStatusUpdatedEvent {
  return {
    ...rebuiltEventObject,
    eventType: 'DemoReminderToBeSentStatusUpdated',
    eventId: v4() as EventId,
    happenedAt: new Date().toISOString() as DateTime,
    data: {
      ...rebuiltEventObject.data,
      messageUUID: event.message_uuid,
      messageStatusPayload: {
        ...event
      },
      demoCounterIncrementResult,
      demoCounterDecrementResult
    }
  };
}

function rebuildWebhookCorrelationData(
  queryParams: Record<string, string>
): Promise<WebhookCorrelationData> {
  logger.info(
    'Attempting to rebuild data sent to messaging provider out of query string parameters',
    {
      queryParams
    }
  );
  return queryStringObjectToTypedObject(queryParams, webhookCorrelationDataSchema)
    .then(
      tap((rebuiltWebhookCorrelationData) => {
        const partialRebuiltEvent = rebuiltWebhookCorrelationData.originalEvent;
        logger.appendKeys({
          userId: partialRebuiltEvent.userId,
          idp: partialRebuiltEvent.idp,
          idpId: partialRebuiltEvent.idpId
        });
        logger.info('Rebuilt webhook correlation data returned by Vonage', {
          rebuiltWebhookCorrelationData
        });
      })
    )
    .catch((error) => {
      return rejectWithMessageAndError(
        'Could not parse query string neither as ActionableEventFoundEvent nor DemoReminderToBeSentEvent along with credit deduction result and estimated message count',
        error
      );
    });
}

function buildStatusUpdatedEvent(
  webhookCorrelationData: WebhookCorrelationData,
  messageStatus: VonageWebhookMessageStatusPayload,
  restoreResult?: CreditAdditionResult<'restore'>,
  demoCounterDecrementResult?: DemoCounterDecrementResult
): ActionableEventReminderStatusUpdatedEvent | DemoReminderToBeSentStatusUpdatedEvent {
  return match(webhookCorrelationData)
    .with({ originalEvent: { eventType: 'ActionableEventFound' } }, (correlationData) => {
      return buildActionableEventReminderStatusUpdated(
        correlationData.originalEvent,
        messageStatus,
        correlationData.creditDeductionResult,
        restoreResult
      );
    })
    .with({ originalEvent: { eventType: 'DemoReminderToBeSent' } }, (correlationData) =>
      buildDemoReminderToBeSentReminderStatusUpdated(
        correlationData.originalEvent,
        messageStatus,
        correlationData.creditDeductionResult,
        demoCounterDecrementResult
      )
    )
    .exhaustive();
}

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.lambdaConfig;
  const snsService = SnsService.withConfig(config.messagingTopicConfig, logger);
  const userBaseStore = UserBaseStore.withConfig(config.userBaseStoreConfig, logger);
  const creditsService = new CreditsService(userBaseStore, logger);
  const creditAdjustmentService = new CreditAdjustmentService(
    config.countryToSMSCostCreditsMap,
    creditsService,
    logger
  );

  return rebuildWebhookCorrelationData(event.queryStringParameters || {})
    .then((webhookData) =>
      creditAdjustmentService
        .processWebhookAdjustment(webhookData, event.body)
        .then(({ creditRestoreResult, demoCounterDecrementResult }) => ({
          webhookData,
          creditRestoreResult,
          demoCounterDecrementResult
        }))
    )
    .then(({ webhookData, creditRestoreResult, demoCounterDecrementResult }) => {
      const rebuiltEvent = buildStatusUpdatedEvent(
        webhookData,
        event.body,
        creditRestoreResult,
        demoCounterDecrementResult
      );
      return snsService.safePublish(rebuiltEvent);
    })
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
