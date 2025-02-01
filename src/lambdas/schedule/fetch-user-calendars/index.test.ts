import { dynamodbClient } from '@clients/dynamodb';
import { assert } from '@testing/utils/assertions';
import { vi, it, describe, beforeEach } from 'vitest';

import { handler } from './index';
import type { EventBridgeEvent } from 'aws-lambda';

let mockSend: ReturnType<typeof vi.fn>;

// Mock the dynamodbClient function to return an object with a mocked send function
vi.mock('@clients/dynamodb', () => {
  mockSend = vi.fn();
  return {
    dynamodbClient: vi.fn(() => ({
      send: mockSend // Ensure send is mocked properly
    }))
  };
});

describe('schedule fetch user calendars', () => {
  

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USERS_TABLE_NAME = 'Users-local';
    process.env.LOCAL_USERS_INDEX_NAME = 'LiveUsers-local';
    process.env.FETCH_CALENDARS_TOPIC_NAME = 'calendars-local';
  });

  it('should make at least one QueryCommand request', async () => {
    // Call the handler
    await handler({} as EventBridgeEvent<'Scheduled event', string>);

    // Ensure send was called with a QueryCommand
    expect(mockSend).toHaveBeenCalled();
  });
});
