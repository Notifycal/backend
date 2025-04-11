import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import type { ReminderToBeSentEvent } from '@model/app-events/ReminderToBeSentEvent';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import type {
  CorrelationId,
  DateTime,
  EventId,
  TemplateId,
  TimeZone
} from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { SnsService } from '@services/sns';
import { interpolate } from '@services/template';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 } from 'uuid';
import { z } from 'zod';
// TODO extract this to a common place
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import { readPostReminderConfig, type PostReminderConfig } from './config';

const bodySchema = z.object({
  template: z.object({
    id: z.string(),
    fields: z.object({
      business: z.object({
        name: z.string().brand('BusinessName'),
        address: z.string().brand('BusinessAddress')
      })
    })
  }),
  startTime: z.string().brand('DateTime'),
  timeZone: z.string().brand('TimeZone')
});

const eventSchema = authedEventSchema<PostReminderConfig>().extend({
  body: JSONStringified(bodySchema)
});
export type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.lambdaConfig;
  const snsService = SnsService.withConfig(config.actionableEventFoundTopicConfig);

  const requestBody = event.body;

  const eventId = v4();
  const actionableEvent: ReminderToBeSentEvent = {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'ReminderToBeSent',
    happenedAt: new Date().toISOString() as DateTime,
    userId: event.requestContext.authorizer.payload.userId,
    idp: event.requestContext.authorizer.payload.idp,
    idpId: event.requestContext.authorizer.payload.idpId,
    data: {
      receiverDetails: {
        type: 'phone',
        phoneNumber: 'Some phone number' as PhoneNumberE164,
        countryCode: 'ES'
      },
      senderDetails: {
        type: 'phone',
        phoneNumber: 'Some phone number' as PhoneNumberE164,
        countryCode: 'ES'
      },
      message: interpolate(
        requestBody.template.id as TemplateId,
        requestBody.template.fields.business.name,
        requestBody.template.fields.business.address,
        'startTime' as DateTime,
        'timeZone' as TimeZone
      )
    }
  };
  return snsService
    .publish(actionableEvent)
    .then(() => successHandler()())
    .catch(errorHandler(500));
}

export const handler = protectedEndpointMiddleware(
  () => readPostReminderConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
