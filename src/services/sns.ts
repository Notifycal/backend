import type { Logger } from '@aws-lambda-powertools/logger';
import { PublishCommand, type PublishCommandOutput, type SNSClient } from '@aws-sdk/client-sns';
import { snsClient } from '@clients/sns';
import type { BaseEvent, BaseSystemEvent } from '@model/app-events/BaseEvent';
import type { SnsTopicConfig } from '@model/Config';
import { doSafely } from '@utils/promises';
import { BaseAwsMessagingService } from './common/base-aws-messaging-service';
import { rethrowError } from './common/error-handling';

export class SnsService extends BaseAwsMessagingService {
  private readonly _client: SNSClient;
  private readonly _config: SnsTopicConfig;
  private constructor(
    config: SnsTopicConfig,
    private readonly logger: Logger
  ) {
    super();
    this._config = config;
    this._client = snsClient();
  }

  public static withConfig(config: SnsTopicConfig, logger: Logger): SnsService {
    return new this(config, logger);
  }

  public publish<TEvent extends BaseEvent | BaseSystemEvent>(
    event: TEvent
  ): Promise<PublishCommandOutput> {
    const publishCommand = new PublishCommand({
      TopicArn: this._config.topicArn,
      Message: JSON.stringify(event),
      MessageAttributes: this.messageAttributes(event),
      MessageDeduplicationId: event.eventId,
      MessageGroupId: '1'
    });
    return this._client.send(publishCommand).then(
      (result) => {
        this.logger.info(`SNS publish result`, {
          eventId: event.eventId,
          result: result,
          eventType: event.eventType,
          userId: event.userId
        });
        return result;
      },
      (error) => {
        const msg = `Error publishing an event to SNS`;
        rethrowError(msg, error, this.logger, { eventId: event.eventId });
      }
    );
  }

  public safePublish<TEvent extends BaseEvent | BaseSystemEvent>(event: TEvent): Promise<void> {
    return doSafely(
      () => this.publish(event),
      () => {
        this.logger.info('Moving on after the error...');
      }
    );
  }
}
