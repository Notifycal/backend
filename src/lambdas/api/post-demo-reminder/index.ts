import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { PhoneStandardContact } from '@model/app-events/common';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { fromStoreRecord } from '@model/store/ContactDetailsRecordStore';
import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import type {
  CorrelationId,
  DateTime,
  EventId,
  IdpName,
  TemplateId,
  UserIdentity
} from '@notifycal/shared/types';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import { SnsService } from '@services/sns';
import { UserBaseStore } from '@services/stores/user-base-store';
import { interpolate } from '@services/template';
import { senderToCanonicalForm } from '@utils/phone';
import { GSM_7_BIT_MESSAGE_LENGTH, normalizeToGSM7Bit } from '@utils/sms';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { demoReminderPayloadSchema } from 'node_modules/@notifycal/shared/dist/schemas/reminder';
import { v4 } from 'uuid';
import type { z } from 'zod';
import { readPostDemoReminderConfig, type PostDemoReminderConfig } from './config';

const bodySchema = demoReminderPayloadSchema;

const eventSchema = authedEventSchema<PostDemoReminderConfig>().extend({
  body: JSONStringified(bodySchema)
});
export type Event = z.infer<typeof eventSchema>;

function ensureMessageIsCheap(msg: string): string {
  const gsm7bitMsg = normalizeToGSM7Bit(msg);
  const lengthHardLimit = 3 * GSM_7_BIT_MESSAGE_LENGTH;
  const threeMessageLimitMessage = gsm7bitMsg.substring(0, lengthHardLimit);
  console.error(threeMessageLimitMessage);
  if (gsm7bitMsg !== threeMessageLimitMessage) {
    logger.warn(`Demo reminder has been truncated to ${lengthHardLimit} characters`);
  }
  return threeMessageLimitMessage;
}

function buildEvent(
  requestBody: Event['body'],
  userReminderConfig: LiveUserStoreRecord<unknown>['Config'],
  templateId: TemplateId,
  userIdentity: UserIdentity<IdpName>
): DemoReminderToBeSentEvent {
  const eventId = v4();
  const message = interpolate(
    templateId,
    userReminderConfig.Business.Name,
    userReminderConfig.Business.Address,
    requestBody.startTime.dateTime,
    requestBody.startTime.timeZone
  );
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'DemoReminderToBeSent',
    happenedAt: new Date().toISOString() as DateTime,
    userId: userIdentity.userId,
    idp: userIdentity.idp,
    idpId: userIdentity.idpId,
    data: {
      senderDetails: senderToCanonicalForm(
        fromStoreRecord(userReminderConfig.Business.SenderContact)
      ),
      receiverDetails: senderToCanonicalForm(
        fromStoreRecord(userReminderConfig.Business.SenderContact)
      ) as PhoneStandardContact, // TODO: when RCS is fully implemented this casting needs to disappear
      message: ensureMessageIsCheap(message)
    }
  };
}

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.lambdaConfig;
  const snsService = SnsService.withConfig(config.demoReminderToBeSentTopicConfig, logger);
  const userBaseStore = UserBaseStore.withConfig(config.userBaseStoreConfig, logger);
  const requestBody = event.body;
  const callerIdentity = event.requestContext.authorizer.payload;
  const userId = callerIdentity.userId;
  const demoReminderLimit = config.demoReminderConfig.demoReminderLimit;

  return userBaseStore
    .getUserConfigAndDemoReminderCount(userId)
    .then((userConfigData) => {
      const templateId = userConfigData?.Config.Calendars[0]?.Template.Id;
      if (!userConfigData?.Config || !templateId) {
        return errorHandler(404)('User config not found');
      }
      if (userConfigData.DemoReminderCount >= demoReminderLimit) {
        return errorHandler(429)('Demo reminder limit reached');
      }
      const demoReminderToBeSent = buildEvent(
        requestBody,
        userConfigData.Config,
        templateId,
        callerIdentity
      );
      return snsService.publish(demoReminderToBeSent).then(() => successHandler(202)());
    })
    .catch((error) => errorHandler(500)('Unexpected error', { error }));
}

const handler = protectedEndpointMiddleware(readPostDemoReminderConfig, eventSchema).handler<Event>(
  lambdaHandler
);

module.exports = { handler };
