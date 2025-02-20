import type { Record } from './index';
import { SqsService } from '@services/sqs';
import type { SendEventReminderConfig } from './config';
import { MessagingService, type VonagePrivateKey } from '@services/messaging';
import type { SendEventReminderAttemptedEvent } from '@model/app-events/SendEventReminderAttemptedEvent';
import { logger } from '@common/powertools';

export async function messageProcessor(
  record: Record,
  config: SendEventReminderConfig,
  privateKey: VonagePrivateKey
): Promise<void> {
  const auditTrailSqs = SqsService.withConfig(config.auditTrailQueueConfig);
  const vonage = new MessagingService(config.vonageConfig.applicationId, privateKey);

  const { body } = record;

  const { correlationId } = body;
  const { message } = body.data;
  const senderNumber = body.data.senderDetails.number;
  const receiverNumber = body.data.receiverDetails.number;

  logger.info(`Sending a message through Vonage. correlationId: ${correlationId}`);
  const messageUUID = await vonage.sendMessage(
    message,
    senderNumber,
    receiverNumber,
    correlationId
  );

  logger.info(`Sending message attempt to audit trail. correlationId: ${correlationId}`);
  try {
    await auditTrailSqs.send<SendEventReminderAttemptedEvent>({
      ...body,
      eventType: 'SendEventReminderAttempted',
      data: {
        ...body.data,
        messageUUID
      }
    });
    logger.info(`Message attempt sent to audit trail. correlationId: ${correlationId}`);
  } catch (err) {
    // Not throwing an error if sending to audit trail fails as we wouldn't want the lambda to fail (and retry) because of it.
    logger.error(
      `Could not send Message attempt to audit trail. correlationId: ${correlationId}. Cause: ${JSON.stringify(err)}`
    );
  }
}
