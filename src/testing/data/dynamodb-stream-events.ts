import { marshall } from '@aws-sdk/util-dynamodb';
import type { AuditTrailStoreRecord } from '@model/store/AuditTrailStoreRecord';
import type { AttributeValue, DynamoDBRecord } from 'aws-lambda';

export interface StreamRecord2 {
  ApproximateCreationDateTime?: number | undefined;
  Keys?: { [key: string]: AttributeValue } | undefined;
  NewImage?: { [key: string]: AttributeValue } | undefined;
  OldImage?: { [key: string]: AttributeValue } | undefined;
  SequenceNumber?: string | undefined;
  SizeBytes?: number | undefined;
  StreamViewType?: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES' | undefined;
}

export interface DynamoDBRecord2 {
  awsRegion?: string | undefined;
  dynamodb?: StreamRecord2 | undefined;
  eventID?: string | undefined;
  eventName?: 'INSERT' | 'MODIFY' | 'REMOVE' | undefined;
  eventSource?: string | undefined;
  eventSourceARN?: string | undefined;
  eventVersion?: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userIdentity?: any;
}

export interface TestingDynamoDbStreamEvent {
  Records: Array<DynamoDBRecord>;
}
const recordBodyOmitted: Omit<DynamoDBRecord, 'dynamodb'> = {
  awsRegion: '',
  eventID: 'someEventId',
  eventName: 'INSERT',
  eventSource: 'aws:dynamodb',
  eventSourceARN: '',
  eventVersion: ''
};
// export function validRecord<TNewImage extends BaseEvent>(
//   newImage: TNewImage
// ): TestingSQSRecord<string> {
//   return {
//     dynamodb: {
//       NewImage: newImage
//     },
//     ...recordBodyOmitted
//   };
// }

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
