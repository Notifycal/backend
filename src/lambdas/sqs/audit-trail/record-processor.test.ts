import { logger } from '@common/powertools';
import type { BaseEvent } from '@model/app-events/BaseEvent';
import type { NoPhoneNumberForAttendeeFoundEvent } from '@model/app-events/NoPhoneNumberForAttendeeFoundEvent';
import { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import {
  noPhoneNumberForAttendeeFoundEvent,
  userCalendarFetchedEvent
} from '@testing/data/app-events';
import { validRecord } from '@testing/data/sqs-events';
import { describe, expect, it, vi } from 'vitest';
import type { AuditTrailConfig } from './config';
import type { Record } from './index';
import { recordProcessor } from './record-processor';

const validEvent = userCalendarFetchedEvent;

const defaultConfig: AuditTrailConfig = {
  auditTrailBaseStoreConfig: {
    tableName: 'some-table-name'
  }
};

describe('Audit trail record processor', () => {
  async function successTest(event: BaseEvent): Promise<void> {
    const putSpy = vi.spyOn(AuditTrailBaseStore.prototype, 'put').mockResolvedValue();
    const loggerSpy = vi.spyOn(logger, 'info');
    await testit(validRecord(event), defaultConfig);

    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy).toHaveBeenCalledWith(
      `Event has been successfully processed. Event id: ${event.eventId}`
    );
  }

  // eslint-disable-next-line vitest/expect-expect
  it('should process an event successfully and log the success message', async () => {
    return successTest(validEvent);
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should process an error event successfully and log the success message', async () => {
    const validErrorEvent: NoPhoneNumberForAttendeeFoundEvent = noPhoneNumberForAttendeeFoundEvent;
    return successTest(validErrorEvent);
  });

  it('should throw an error if processing fails', async () => {
    const error = new Error('Boom!');
    const putSpy = vi.spyOn(AuditTrailBaseStore.prototype, 'put').mockRejectedValue(error);

    await expect(testit(validRecord(validEvent), defaultConfig)).rejects.toThrow(
      `Failed to process event. Event id: ${validEvent.eventId}. Error: Boom!`
    );

    expect(putSpy).toHaveBeenCalledTimes(1);
  });
});

function testit(record: Record, config: AuditTrailConfig = defaultConfig): Promise<void> {
  return recordProcessor(record, config);
}
