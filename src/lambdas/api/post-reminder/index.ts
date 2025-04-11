import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import type { CorrelationId, DateTime, EventId } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { SnsService } from '@services/sns';
import { interpolate } from '@services/template';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 } from 'uuid';
import { z } from 'zod';
// TODO extract this to a common place
import { readPostReminderConfig, type PostReminderConfig } from './config';

const bodySchema = z.object({});

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
  const actionableEvent: ActionableEventFoundEvent = {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'ActionableEventFound',
    happenedAt: new Date().toISOString() as DateTime,
    userId: event.requestContext.authorizer.payload.userId,
    idp: event.requestContext.authorizer.payload.idp,
    idpId: event.requestContext.authorizer.payload.idpId,
    data: {
      run: {},
      calendar: {},
      calendarEvent: {},
      receiverDetails: {
        type: 'phone',
        phoneNumber: 'Some phone number' as PhoneNumberE164
      },
      senderDetails: {},
      message: interpolate(
        requestBody.template.id,
        requestBody.template.fields.business.name,
        requestBody.template.fields.business.address,
        'startTime',
        'timeZone'
      )
    }
  };
  return snsService.publish(actionableEvent);
}

export const handler = protectedEndpointMiddleware(
  () => readPostReminderConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
