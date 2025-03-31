import { PublishCommand, type PublishCommandOutput, type SNSClient } from '@aws-sdk/client-sns';
import { snsClient } from '@clients/sns';
import { logger } from '@common/powertools';
import type { BaseEvent } from '@model/app-events/BaseEvent';
import type { SnsTopicConfig } from '@model/Config';
import { BaseAwsMessagingService } from './common/base-aws-messaging-service';
import { throwError } from './common/error-handling';

export class SnsService extends BaseAwsMessagingService {
  private readonly _client: SNSClient;
  private readonly _config: SnsTopicConfig;
  private constructor(config: SnsTopicConfig) {
    super();
    this._config = config;
    this._client = snsClient();
  }

  public static withConfig(config: SnsTopicConfig): SnsService {
    return new this(config);
  }

  public publish<TEvent extends BaseEvent>(event: TEvent): Promise<PublishCommandOutput> {
    const publishCommand = new PublishCommand({
      TopicArn: this._config.topicArn,
      Message: JSON.stringify(event),
      MessageAttributes: this.messageAttributes(event),
      MessageDeduplicationId: event.eventId,
      MessageGroupId: '1'
    });
    return this._client.send(publishCommand).then(
      (result) => {
        logger.info(`SNS publish result`, { eventId: event.eventId, result: result });
        return result;
      },
      (error) => {
        const msg = `Error publishing an event to SNS`;
        throwError(msg, error, { eventId: event.eventId });
      }
    );
  }
}
