import type { MessageAttributeValue } from '@aws-sdk/client-sns';
import type { BaseEvent } from '@model/app-events/BaseEvent';

export abstract class BaseAwsService {
  protected messageAttributes(event: BaseEvent): Record<string, MessageAttributeValue> {
    return {
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
    };
  }
}
