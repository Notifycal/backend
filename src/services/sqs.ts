import {
  type SendMessageCommandOutput,
  type SQSClient,
  SendMessageCommand
} from '@aws-sdk/client-sqs';
import { sqsClient } from '@clients/sqs';
import { logger } from '@common/powertools';
import type { SqsQueueConfig } from '@model/Config';
import type { BaseEvent } from '@model/app-events/BaseEvent';
import { BaseAwsService } from './common/base-aws-service';
import { extractErrorMessage } from './common/error-handling';

export class SqsService extends BaseAwsService {
  private readonly _client: SQSClient;
  private readonly _config: SqsQueueConfig;
  private constructor(config: SqsQueueConfig) {
    super();
    this._config = config;
    this._client = sqsClient();
  }

  public static withConfig(config: SqsQueueConfig): SqsService {
    return new this(config);
  }

  public sendEvent<TEvent extends BaseEvent>(event: TEvent): Promise<SendMessageCommandOutput> {
    const sendMessageCommand = new SendMessageCommand({
      QueueUrl: this._config.queueUrl,
      MessageBody: JSON.stringify(event),
      MessageAttributes: this.messageAttributes(event),
      MessageDeduplicationId: event.eventId,
      MessageGroupId: '1'
    });
    return this._client.send(sendMessageCommand).then(
      (result) => {
        logger.info(
          `SQS send result. Event id: ${event.eventId}. Result: ${JSON.stringify(result)}`
        );
        return result;
      },
      (error) => {
        logger.error(
          `Error sending an event to SQS with id ${event.eventId}. Error: ${JSON.stringify(error)}. Extracted error: ${extractErrorMessage(error)}`
        );
        logger.info(`Moving on after error...`);
        return {} as SendMessageCommandOutput;
      }
    );
  }
}
