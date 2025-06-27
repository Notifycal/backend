import {
  type SendMessageCommandOutput,
  type SQSClient,
  SendMessageCommand
} from '@aws-sdk/client-sqs';
import { sqsClient } from '@clients/sqs';
import { logger } from '@common/powertools';
import type { BaseEvent, BaseSystemEvent } from '@model/app-events/BaseEvent';
import type { SqsQueueConfig } from '@model/Config';
import { BaseAwsMessagingService } from './common/base-aws-messaging-service';
import { rethrowError } from './common/error-handling';
import type { Logger } from '@aws-lambda-powertools/logger';

export class SqsService extends BaseAwsMessagingService {
  private readonly _client: SQSClient;
  private readonly _config: SqsQueueConfig;
  private constructor(
    config: SqsQueueConfig,
    private readonly logger: Logger
  ) {
    super();
    this._config = config;
    this._client = sqsClient();
  }

  public static withConfig(config: SqsQueueConfig, logger: Logger): SqsService {
    return new this(config, logger);
  }

  public send<TEvent extends BaseEvent | BaseSystemEvent>(
    event: TEvent
  ): Promise<SendMessageCommandOutput> {
    const fifoParams = this._config.queueUrl.endsWith('.fifo')
      ? {
          MessageDeduplicationId: event.eventId,
          MessageGroupId: '1'
        }
      : {};
    const sendMessageCommand = new SendMessageCommand({
      QueueUrl: this._config.queueUrl,
      MessageBody: JSON.stringify(event),
      MessageAttributes: this.messageAttributes(event),
      ...fifoParams
    });
    return this._client.send(sendMessageCommand).then(
      (result) => {
        logger.info(`SQS send result`, { eventId: event.eventId, result: result });
        return result;
      },
      (error) =>
        rethrowError(`Error sending an event to SQS`, error, this.logger, {
          eventId: event.eventId
        })
    );
  }
}
