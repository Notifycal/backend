import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { phoneE164Schema } from '@model/app-events/common';
import type { ReminderToBeSentEvent } from '@model/app-events/ReminderToBeSentEvent';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { fromStoreRecord } from '@model/store/ContactDetailsRecordStore';
import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import type { CorrelationId, DateTime, EventId, Identity, IdpName } from '@notifycal/shared/types';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import { SnsService } from '@services/sns';
import { UserLiveIndexStore } from '@services/stores/user-live-index-store';
import { interpolate } from '@services/template';
import { receiverValidator, toCanonicalForm } from '@utils/phone';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 } from 'uuid';
import { z } from 'zod';
import { readPostReminderConfig, type PostReminderConfig } from './config';

const bodySchema = z.object({
  receiverDetails: phoneE164Schema.superRefine(receiverValidator),
  startTime: z.object({
    dateTime: z.string().brand('DateTime'),
    timeZone: z.string().brand('TimeZone')
  })
});

const eventSchema = authedEventSchema<PostReminderConfig>().extend({
  body: JSONStringified(bodySchema)
});
export type Event = z.infer<typeof eventSchema>;

function buildEvent(
  requestBody: Event['body'],
  userReminderConfig: LiveUserStoreRecord<unknown>['Config'],
  identity: Identity<IdpName>
): ReminderToBeSentEvent {
  const eventId = v4();
  const templateId = userReminderConfig.Calendars[0].Template.Id;
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'ReminderToBeSent',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      senderDetails: toCanonicalForm(fromStoreRecord(userReminderConfig.Business.SenderContact)),
      receiverDetails: requestBody.receiverDetails,
      message: interpolate(
        templateId,
        userReminderConfig.Business.Name,
        userReminderConfig.Business.Address,
        requestBody.startTime.dateTime,
        requestBody.startTime.timeZone
      )
    }
  };
}

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.lambdaConfig;
  const snsService = SnsService.withConfig(config.reminderToBeSentTopicConfig);
  const userLiveProvider = UserLiveIndexStore.withConfig(config.userLiveIndexStoreConfig);
  const requestBody = event.body;
  const callerIdentity = event.requestContext.authorizer.payload;
  const userId = callerIdentity.userId;

  return userLiveProvider
    .getLiveUserConfigById(userId)
    .then((configOrNot) =>
      configOrNot
        ? Promise.resolve(buildEvent(requestBody, configOrNot, callerIdentity))
        : Promise.reject(new Error('User config not found'))
    )
    .then((reminderToBeSent) => snsService.publish(reminderToBeSent))
    .then(() => successHandler(202)())
    .catch(errorHandler(500));
}

export const handler = protectedEndpointMiddleware(
  () => readPostReminderConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
