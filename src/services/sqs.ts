import type { SendMessageBatchCommandInput } from '@aws-sdk/client-sqs';
import {
  type SendMessageCommandOutput,
  type SQSClient,
  SendMessageBatchCommand,
  SendMessageCommand
} from '@aws-sdk/client-sqs';
import { sqsClient } from '@clients/sqs';
import { logger } from '@common/powertools';
import type { BaseEvent } from '@model/app-events/BaseEvent';
import type { SqsQueueConfig } from '@model/Config';
import { BaseAwsMessagingService } from './common/base-aws-messaging-service';
import { throwError } from './common/error-handling';

export class SqsService extends BaseAwsMessagingService {
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

  public send<TEvent extends BaseEvent>(event: TEvent): Promise<SendMessageCommandOutput> {
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
      (error) => throwError(`Error sending an event to SQS`, error, { eventId: event.eventId })
    );
  }

  public sendBatch<TEvent extends BaseEvent>(
    events: Array<TEvent>
  ): Promise<SendMessageCommandOutput> {
    const fifoParams = this._config.queueUrl.endsWith('.fifo')
      ? {
          MessageGroupId: '1'
        }
      : {};
    const entries = events.map((event) => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Id: event.eventId || event.id || 'some-id',
      MessageBody: JSON.stringify(event),
      MessageDeduplicationId: event.eventId,
      ...fifoParams
    }));
    const input: SendMessageBatchCommandInput = {
      QueueUrl: this._config.queueUrl,
      Entries: entries,
      ...fifoParams
    };
    const sendMessageCommand = new SendMessageBatchCommand(input);
    return this._client.send(sendMessageCommand).then(
      (result) => {
        logger.info(`SQS send result`);
        return result;
      },
      (error) => throwError(`Error sending an event to SQS`, error)
    );
  }
}
