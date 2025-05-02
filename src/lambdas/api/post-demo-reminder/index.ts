import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { fromStoreRecord } from '@model/store/ContactDetailsRecordStore';
import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import { dateTimeSchema, phoneSchema, timeZoneSchema } from '@notifycal/shared/schemas';
import type { CorrelationId, DateTime, EventId, Identity, IdpName } from '@notifycal/shared/types';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import { SnsService } from '@services/sns';
import { UserBaseStore } from '@services/stores/user-base-store';
import { interpolate } from '@services/template';
import { receiverToCanonicalForm, receiverValidator, senderToCanonicalForm } from '@utils/phone';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 } from 'uuid';
import { z } from 'zod';
import { readPostDemoReminderConfig, type PostDemoReminderConfig } from './config';

const bodySchema = z.object({
  receiverContact: phoneSchema.superRefine(receiverValidator),
  startTime: z.object({
    dateTime: dateTimeSchema,
    timeZone: timeZoneSchema
  })
});

const eventSchema = authedEventSchema<PostDemoReminderConfig>().extend({
  body: JSONStringified(bodySchema)
});
export type Event = z.infer<typeof eventSchema>;

function buildEvent(
  requestBody: Event['body'],
  userReminderConfig: LiveUserStoreRecord<unknown>['Config'],
  identity: Identity<IdpName>
): DemoReminderToBeSentEvent {
  const eventId = v4();
  const templateId = userReminderConfig.Calendars[0].Template.Id;
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'DemoReminderToBeSent',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      senderDetails: senderToCanonicalForm(
        fromStoreRecord(userReminderConfig.Business.SenderContact)
      ),
      receiverDetails: receiverToCanonicalForm(requestBody.receiverContact),
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
  const snsService = SnsService.withConfig(config.demoReminderToBeSentTopicConfig);
  const userBaseStore = UserBaseStore.withConfig(config.userBaseStoreConfig);
  const requestBody = event.body;
  const callerIdentity = event.requestContext.authorizer.payload;
  const userId = callerIdentity.userId;

  return userBaseStore
    .getUserConfigById(userId)
    .then((configOrNot) =>
      configOrNot
        ? Promise.resolve(buildEvent(requestBody, configOrNot, callerIdentity))
        : Promise.reject(new Error('User config not found'))
    )
    .then((demoReminderToBeSent) => snsService.publish(demoReminderToBeSent))
    .then(() => successHandler(202)())
    .catch(errorHandler(500));
}

const handler = protectedEndpointMiddleware(
  () => readPostDemoReminderConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
