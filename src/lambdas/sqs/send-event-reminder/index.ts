import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { z } from 'zod';
import { readSendEventReminderConfig, type SendEventReminderConfig } from './config';
import type { Context } from 'aws-lambda';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { MessagingService, type VonagePrivateKey } from '@services/messaging';
import type { Uuid } from '@notifycal/shared/types';

const eventSchema = eventSqsSchema<SendEventReminderConfig, typeof actionableEventFoundEventSchema>(
  actionableEventFoundEventSchema
);
export type Event = z.infer<typeof eventSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function lambdaHandler(event: Event, context: Context): Promise<Uuid | void> {
  logger.info(`Processing sqs message in third lambda. Event: ${JSON.stringify(event)}`);

  const vonagePrivateKey = (await getParameter(
    event.lambdaConfig.vonageConfig.privateKeySSMPath
  )) as VonagePrivateKey;

  const messenger = new MessagingService(
    event.lambdaConfig.vonageConfig.applicationId,
    vonagePrivateKey
  );

  const eventBody = event.Records[0].body;

  return messenger.sendMessage(
    eventBody.data.message,
    eventBody.data.receiverDetails.number,
    eventBody.correlationId
  );
}

export const handler = backgroundProcessingMiddleware(
  () => readSendEventReminderConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
