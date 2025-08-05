import type { EventBridgeEvent } from 'aws-lambda';

export const fakeScheduledEventBridgeEvent: EventBridgeEvent<'Scheduled event', string> = {
  id: 'dbd92569-8d30-1f34-d3a8-47fbce1f7494',
  version: 'someVersion',
  account: 'someAccount',
  time: '2025-02-07T14:53:57.018Z',
  region: 'eu-west-1',
  resources: [],
  source: 'someSource',
  'detail-type': 'Scheduled event',
  detail: 'SomeDetails',
  'replay-name': 'Some replay name'
};
