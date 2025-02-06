import type { EventBridgeEvent } from 'aws-lambda';

export const fakeScheduledEventBridgeEvent: EventBridgeEvent<'Scheduled event', string> = {
  id: 'fakeId',
  version: 'someVersion',
  account: 'someAccount',
  time: '2025-01-01',
  region: 'eu-west-1',
  resources: [],
  source: 'someSource',
  'detail-type': 'Scheduled event',
  detail: 'SomeDetails'
};
