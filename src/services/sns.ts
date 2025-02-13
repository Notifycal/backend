import { PublishCommand, type PublishCommandOutput, type SNSClient } from '@aws-sdk/client-sns';
import { snsClient } from '@clients/sns';
import { logger } from '@common/powertools';
import type { SnsTopicConfig } from '@model/Config';
import type { BaseEvent } from '@model/app-events/BaseEvent';
import { BaseAwsService } from './common/base-aws-service';
import { extractErrorMessage } from './common/error-handling';

export class SnsService extends BaseAwsService {
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

  public publishEvent<TEvent extends BaseEvent>(event: TEvent): Promise<PublishCommandOutput> {
    const publishCommand = new PublishCommand({
      TopicArn: this._config.topicArn,
      Message: JSON.stringify(event),
      MessageAttributes: this.messageAttributes(event),
      MessageDeduplicationId: event.eventId,
      MessageGroupId: '1'
    });
    return this._client.send(publishCommand).then(
      (result) => {
        logger.info(
          `SNS publish result. Event id: ${event.eventId}. Result: ${JSON.stringify(result)}`
        );
        return result;
      },
      (error) => {
        logger.error(
          `Error publishing an event to SNS with id ${event.eventId}. Error: ${JSON.stringify(error)}. Extracted error: ${extractErrorMessage(error)}`
        );
        logger.info(`Moving on after error...`);
        return {} as PublishCommandOutput;
      }
    );
  }
}
