import { logger } from '@common/powertools';
import type { EmailingSenderEndpointConfig } from '@model/Config';
import type { AlertStoreRecord } from '@model/store/AlertStoreRecord';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type { Email, IdpName, UserId } from '@notifycal/shared/types';
import type { SnsService } from '@services/sns';
import type { AlertsBaseStore } from '@services/stores/alerts-base-store';
import type { UserBaseStore } from '@services/stores/user-base-store';
import {
  auditTrailActionableEventFoundEvent,
  auditTrailNoPhoneNumberForCalendarEventFoundEvent
} from '@testing/data/app-events';
import { describe, expect, it, vi } from 'vitest';
import type { AlertEndpointConfig } from './config';
import { recordProcessor } from './record-processor';
import type {
  AuditTrailActionableEventFoundEvent,
  AuditTrailNoPhoneNumberForCalendarEventFoundEvent
} from './schema';

describe('Alert for missing phone number record processor', () => {
  const validActionableEventRecord: AuditTrailActionableEventFoundEvent =
    auditTrailActionableEventFoundEvent as AuditTrailActionableEventFoundEvent;

  const validNoPhoneNumberRecord: AuditTrailNoPhoneNumberForCalendarEventFoundEvent =
    auditTrailNoPhoneNumberForCalendarEventFoundEvent as AuditTrailNoPhoneNumberForCalendarEventFoundEvent;

  const validEmail = 'test@notifycal.com' as Email;
  const validConfig: AlertEndpointConfig & EmailingSenderEndpointConfig = {
    alertThresholdConfig: {
      errorRateThreshold: 5,
      maxNotificationsPerDay: 1,
      countThresholdToEnableTrigger: 0
    },
    emailingSenderConfig: {
      sender: {
        name: 'Notifycal',
        email: 'some@email.com' as Email
      }
    },
    alertEmailConfig: {
      faqUrl: new URL('https://test.notifycal.com/faq')
    }
  };
  const validEmailAndConfig = {
    Email: 'test@notifycal.com' as Email,
    Config: {
      business: {} //TODO: Add the actual config structure here where the languague lives. Remove "as unknown"
    }
  } as unknown as Pick<UserStoreRecord<unknown>, 'Email' | 'Config'>;

  it('should process an ActionableEventFound event and increment SuccessCount', async () => {
    const incrementCounterFn = vi.fn().mockResolvedValue({
      HashKey: 'NoPhoneNumberForCalendarEventFound#2024-01-02',
      SortKey: auditTrailActionableEventFoundEvent.UserId,
      SuccessCount: 5,
      FailureCount: 0,
      NotificationSentCount: 0
    });
    const getEmailAndConfigByIdFn = vi.fn().mockResolvedValue(validEmailAndConfig);
    const publishFn = vi.fn().mockResolvedValue({});

    await testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndConfigByIdFn,
      publishFn
    );

    expect(incrementCounterFn).toHaveBeenCalledTimes(1);
    expect(incrementCounterFn).toHaveBeenCalledWith(
      'NoPhoneNumberForCalendarEventFound#2024-01-02',
      auditTrailActionableEventFoundEvent.UserId,
      'SuccessCount'
    );
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('should process a NoPhoneNumberForCalendarEventFound event and increment FailureCount', async () => {
    const incrementCounterFn = vi.fn().mockResolvedValue({
      HashKey: 'NoPhoneNumberForCalendarEventFound#2024-01-01',
      SortKey: validNoPhoneNumberRecord.UserId,
      SuccessCount: 0,
      FailureCount: 1,
      NotificationSentCount: 0
    });
    const getEmailAndConfigByIdFn = vi.fn().mockResolvedValue(validEmailAndConfig);
    const publishFn = vi.fn().mockResolvedValue({});

    await testIt(validNoPhoneNumberRecord, incrementCounterFn, getEmailAndConfigByIdFn, publishFn);

    expect(incrementCounterFn).toHaveBeenCalledTimes(2);
    expect(incrementCounterFn).toHaveBeenCalledWith(
      'NoPhoneNumberForCalendarEventFound#2024-01-02',
      validNoPhoneNumberRecord.UserId,
      'FailureCount'
    );
    expect(incrementCounterFn).toHaveBeenCalledWith(
      'NoPhoneNumberForCalendarEventFound#2024-01-02',
      validNoPhoneNumberRecord.UserId,
      'NotificationSentCount'
    );
    expect(publishFn).toHaveBeenCalledOnce();
  });

  it('should not send an alert when error rate is below threshold', async () => {
    const incrementCounterFn = vi.fn().mockResolvedValue({
      HashKey: 'NoPhoneNumberForCalendarEventFound#2024-01-02',
      SortKey: validNoPhoneNumberRecord.UserId,
      SuccessCount: 95,
      FailureCount: 4,
      NotificationSentCount: 0
    });
    const getEmailAndConfigByIdFn = vi.fn().mockResolvedValue(validEmailAndConfig);
    const publishFn = vi.fn().mockResolvedValue({});

    await testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndConfigByIdFn,
      publishFn
    );

    expect(incrementCounterFn).toHaveBeenCalledTimes(1);
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('should send an alert when error rate is above threshold and notification not yet sent', async () => {
    const incrementCounterFn = vi
      .fn()
      .mockResolvedValueOnce({
        HashKey: 'NoPhoneNumberForCalendarEventFound#2024-01-02',
        SortKey: validActionableEventRecord.UserId,
        SuccessCount: 90,
        FailureCount: 10,
        NotificationSentCount: 0
      })
      .mockResolvedValueOnce({
        HashKey: 'NoPhoneNumberForCalendarEventFound#2024-01-02',
        SortKey: validActionableEventRecord.UserId,
        SuccessCount: 90,
        FailureCount: 10,
        NotificationSentCount: 1
      });
    const getEmailAndConfigByIdFn = vi.fn().mockResolvedValue(validEmailAndConfig);
    const publishFn = vi.fn().mockResolvedValue({});

    await testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndConfigByIdFn,
      publishFn
    );

    expect(incrementCounterFn).toHaveBeenCalledTimes(2);
    expect(incrementCounterFn).toHaveBeenNthCalledWith(
      1,
      'NoPhoneNumberForCalendarEventFound#2024-01-02',
      validActionableEventRecord.UserId,
      'SuccessCount'
    );
    expect(incrementCounterFn).toHaveBeenNthCalledWith(
      2,
      'NoPhoneNumberForCalendarEventFound#2024-01-02',
      validActionableEventRecord.UserId,
      'NotificationSentCount'
    );
    expect(publishFn).toHaveBeenCalledTimes(1);

    expect(publishFn).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EmailToBeSent',
        correlationId: validActionableEventRecord.CorrelationId,
        idp: 'google.com',
        idpId: '45346356356',
        userId: validActionableEventRecord.UserId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          from: validConfig.emailingSenderConfig.sender,
          to: validEmail,
          subject: 'Alerta: Recordatorio no enviado',
          tags: []
        })
      })
    );
  });

  it('should not send an alert when notification already sent', async () => {
    const incrementCounterFn = vi.fn().mockResolvedValue({
      HashKey: 'NoPhoneNumberForCalendarEventFound#2024-01-02',
      SortKey: validActionableEventRecord.UserId,
      SuccessCount: 90,
      FailureCount: 10,
      NotificationSentCount: 1
    });
    const getEmailAndConfigByIdFn = vi.fn().mockResolvedValue(validEmailAndConfig);
    const publishFn = vi.fn().mockResolvedValue({});

    await testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndConfigByIdFn,
      publishFn
    );

    expect(incrementCounterFn).toHaveBeenCalledTimes(1);
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('should log an error and finish gracefully if a notifycation could not be sent due to user email being missing in persistence', async () => {
    const incrementCounterFn = vi.fn().mockResolvedValue({
      HashKey: 'NoPhoneNumberForCalendarEventFound#2024-01-02',
      SortKey: validActionableEventRecord.UserId,
      SuccessCount: 90,
      FailureCount: 10,
      NotificationSentCount: 1
    });
    const getEmailById = vi.fn().mockResolvedValue(undefined);
    const publishFn = vi.fn().mockResolvedValue({});

    await testIt(validActionableEventRecord, incrementCounterFn, getEmailById, publishFn);

    expect(incrementCounterFn).toHaveBeenCalledTimes(1);
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('should throw an error when processing fails', async () => {
    const error = new Error('Test error');
    const incrementCounterFn = vi.fn().mockRejectedValue(error);
    const getEmailAndConfigByIdFn = vi.fn().mockResolvedValue(validEmailAndConfig);
    const publishFn = vi.fn().mockResolvedValue({});

    const result = testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndConfigByIdFn,
      publishFn
    );

    await expect(result).rejects.toThrow(
      new Error('(Re)-Throwing error on purpose to notify of batch item failure', error)
    );
  });

  it('should throw an error when email fetching fails', async () => {
    const error = new Error('Email Test error');
    const incrementCounterFn = vi.fn().mockResolvedValue({
      HashKey: 'NoPhoneNumberForCalendarEventFound#2024-01-02',
      SortKey: validActionableEventRecord.UserId,
      SuccessCount: 90,
      FailureCount: 10,
      NotificationSentCount: 0
    });
    const getEmailAndConfigByIdFn = vi.fn().mockRejectedValue(error);
    const publishFn = vi.fn().mockResolvedValue({});

    const result = testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndConfigByIdFn,
      publishFn
    );

    await expect(result).rejects.toThrow(
      new Error('(Re)-Throwing error on purpose to notify of batch item failure', error)
    );
  });

  function testIt(
    event: AuditTrailActionableEventFoundEvent | AuditTrailNoPhoneNumberForCalendarEventFoundEvent,
    incrementCounterFn: () => Promise<AlertStoreRecord<string, UserId>>,
    getEmailAndConfigByIdFn: () => Promise<
      Pick<UserStoreRecord<unknown>, 'Email' | 'Config'> | undefined
    >,
    publishFn: () => Promise<void>,
    config: AlertEndpointConfig & EmailingSenderEndpointConfig = validConfig
  ): Promise<void> {
    const alertsBaseStoreMock = {
      incrementCounter: incrementCounterFn
    } as unknown as AlertsBaseStore;
    const userBaseStoreMock = {
      getEmailAndConfigById: getEmailAndConfigByIdFn
    } as unknown as UserBaseStore<IdpName>;
    const snsServiceMock = {
      publish: publishFn
    } as unknown as SnsService;

    return recordProcessor(
      event,
      config,
      alertsBaseStoreMock,
      userBaseStoreMock,
      snsServiceMock,
      logger
    );
  }
});
