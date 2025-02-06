import { PublishCommand, type PublishCommandOutput, type SNSClient } from '@aws-sdk/client-sns';
import { snsClient } from '@clients/sns';
import { logger } from '@common/powertools';
import type { SnsTopicConfig } from '@model/Config';
import type { BaseEvent } from '@model/app-events/BaseEvent';
import { extractErrorMessage } from './common/error-handling';

export class SnsService {
  private readonly _client: SNSClient;
  private readonly _config: SnsTopicConfig;
  private constructor(config: SnsTopicConfig) {
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
      MessageAttributes: {
        EventId: {
          DataType: 'String',
          StringValue: event.eventId
        },
        CorrelationId: {
          DataType: 'String',
          StringValue: event.correlationId
        },
        EventType: {
          DataType: 'String',
          StringValue: event.eventType
        },
        HappenedAt: {
          DataType: 'String',
          StringValue: event.happenedAt
        },
        UserId: {
          DataType: 'String',
          StringValue: event.userId
        },
        Idp: {
          DataType: 'String',
          StringValue: event.idp
        },
        IdpId: {
          DataType: 'String',
          StringValue: event.idpId
        }
      },
      MessageDeduplicationId: event.eventId,
      MessageGroupId: '1'
    });
    return this._client.send(publishCommand).then(
      (result) => {
        logger.info(`SNS publish result ${JSON.stringify(result)}`);
        return result;
      },
      (error) => {
        logger.error(`Error publishing an event to SNS. Error: ${extractErrorMessage(error)}`);
        logger.info(`Moving on after error...`);
        return {} as PublishCommandOutput;
      }
    );
  }
}
