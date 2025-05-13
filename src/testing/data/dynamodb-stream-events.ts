import { marshall } from '@aws-sdk/util-dynamodb';
import type { AuditTrailStoreRecord } from '@model/store/AuditTrailStoreRecord';
import type { AttributeValue, DynamoDBRecord } from 'aws-lambda';

const recordBodyOmitted: Omit<DynamoDBRecord, 'dynamodb'> = {
  awsRegion: '',
  eventID: 'someEventId',
  eventName: 'INSERT',
  eventSource: 'aws:dynamodb',
  eventSourceARN: '',
  eventVersion: ''
};

export function validRawRecord<TNewImage extends AuditTrailStoreRecord>(
  newImage: TNewImage
): DynamoDBRecord {
  return {
    dynamodb: {
      NewImage: marshall(newImage) as { [key: string]: AttributeValue },
      StreamViewType: 'NEW_IMAGE',
      SizeBytes: 123,
      SequenceNumber: '123',
      Keys: {}
    },
    ...recordBodyOmitted
  };
}
