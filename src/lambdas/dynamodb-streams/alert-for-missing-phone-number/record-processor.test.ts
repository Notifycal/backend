import { logger } from '@common/powertools';
import { emailToBeSent, type EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailingSenderEndpointConfig } from '@model/Config';
import type { AlertStoreRecord } from '@model/store/AlertStoreRecord';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type {
  CorrelationId,
  Email,
  IdpId,
  IdpName,
  LanguageCode,
  UserId
} from '@notifycal/shared/types';
import type { EmailHtmlBody, EmailSubject } from '@own-types/model';
import { EmailTemplateService } from '@services/email-template-service';
import type { SnsService } from '@services/sns';
import type { AlertsBaseStore } from '@services/stores/alerts-base-store';
import type { UserBaseStore } from '@services/stores/user-base-store';
import {
  auditTrailActionableEventFoundEvent,
  auditTrailNoPhoneNumberForCalendarEventFoundEvent
} from '@testing/data/app-events';
import { describe, expect, it, vi } from 'vitest';
import type { AlertEmailEndpointConfig, AlertEndpointConfig } from './config';
import { recordProcessor } from './record-processor';
import type {
  AuditTrailActionableEventFoundEvent,
  AuditTrailNoPhoneNumberForCalendarEventFoundEvent
} from './schema';

vi.mock('@services/email-template-service');

describe('Alert for missing phone number record processor', () => {
  const validActionableEventRecord: AuditTrailActionableEventFoundEvent =
    auditTrailActionableEventFoundEvent as AuditTrailActionableEventFoundEvent;

  const validNoPhoneNumberRecord: AuditTrailNoPhoneNumberForCalendarEventFoundEvent =
    auditTrailNoPhoneNumberForCalendarEventFoundEvent as AuditTrailNoPhoneNumberForCalendarEventFoundEvent;

  const validEmail = 'test@notifycal.com' as Email;
  const validConfig: AlertEndpointConfig & EmailingSenderEndpointConfig & AlertEmailEndpointConfig =
    {
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
        faqUrl: new URL('https://test.notifycal.com/faq'),
        topupUrl: new URL('https://test.notifycal.com/pricing')
      }
    };
  const validEmailAndLanguage = {
    Email: 'test@notifycal.com' as Email,
    Language: 'es'
  } as Pick<UserStoreRecord<unknown>, 'Email'> & { Language: LanguageCode };

  const validEmailEvent: EmailToBeSentEvent = emailToBeSent(
    {
      userId: 'test-user' as UserId,
      idp: 'google.com',
      idpId: 'test-idp-id' as IdpId
    },
    {
      from: validConfig.emailingSenderConfig.sender,
      to: validEmail,
      subject: 'Alerta: Recordatorio no enviado' as EmailSubject,
      htmlBody: '<p>Test email body</p>' as EmailHtmlBody,
      tags: [],
      subEventType: 'NoPhoneNumberForCalendarEventFound',
      inlineAttachments: {},
      metadata: {
        actionableEventFoundCount: 90,
        noPhoneNumberForCalendarEventFoundCount: 10,
        errorRate: 10,
        notificationsSentCountBeforeUpdate: 0
      }
    },
    { correlationId: 'test-correlation' as CorrelationId }
  );

  it('should process an ActionableEventFound event and increment SuccessCount', async () => {
    const incrementCounterFn = vi.fn().mockResolvedValue({
      HashKey: 'NoPhoneNumberForCalendarEventFound#2024-01-02',
      SortKey: auditTrailActionableEventFoundEvent.UserId,
      SuccessCount: 5,
      FailureCount: 0,
      NotificationSentCount: 0
    });
    const getEmailAndLanguageByIdFn = vi.fn().mockResolvedValue(validEmailAndLanguage);
    const publishFn = vi.fn().mockResolvedValue({});
    const createEmailEventFn = vi.fn();

    await testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndLanguageByIdFn,
      publishFn,
      createEmailEventFn
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
    const getEmailAndLanguageByIdFn = vi.fn().mockResolvedValue(validEmailAndLanguage);
    const publishFn = vi.fn().mockResolvedValue({});
    const createEmailEventFn = vi.fn();

    await testIt(
      validNoPhoneNumberRecord,
      incrementCounterFn,
      getEmailAndLanguageByIdFn,
      publishFn,
      createEmailEventFn
    );

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
    const getEmailAndLanguageByIdFn = vi.fn().mockResolvedValue(validEmailAndLanguage);
    const publishFn = vi.fn().mockResolvedValue({});
    const createEmailEventFn = vi.fn();

    await testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndLanguageByIdFn,
      publishFn,
      createEmailEventFn
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
    const getEmailAndLanguageByIdFn = vi.fn().mockResolvedValue(validEmailAndLanguage);
    const publishFn = vi.fn().mockResolvedValue({});
    const createEmailEventFn = vi.fn().mockReturnValue(validEmailEvent);

    await testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndLanguageByIdFn,
      publishFn,
      createEmailEventFn
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

    expect(publishFn).toHaveBeenCalledWith(validEmailEvent);
  });

  it('should not send an alert when notification already sent', async () => {
    const incrementCounterFn = vi.fn().mockResolvedValue({
      HashKey: 'NoPhoneNumberForCalendarEventFound#2024-01-02',
      SortKey: validActionableEventRecord.UserId,
      SuccessCount: 90,
      FailureCount: 10,
      NotificationSentCount: 1
    });
    const getEmailAndLanguageByIdFn = vi.fn().mockResolvedValue(validEmailAndLanguage);
    const publishFn = vi.fn().mockResolvedValue({});
    const createEmailEventFn = vi.fn();

    await testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndLanguageByIdFn,
      publishFn,
      createEmailEventFn
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
    const getEmailAndLanguageByIdFn = vi.fn().mockResolvedValue(undefined);
    const publishFn = vi.fn().mockResolvedValue({});
    const createEmailEventFn = vi.fn();

    await testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndLanguageByIdFn,
      publishFn,
      createEmailEventFn
    );

    expect(incrementCounterFn).toHaveBeenCalledTimes(1);
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('should throw an error when processing fails', async () => {
    const error = new Error('Test error');
    const incrementCounterFn = vi.fn().mockRejectedValue(error);
    const getEmailAndLanguageByIdFn = vi.fn().mockResolvedValue(validEmailAndLanguage);
    const publishFn = vi.fn().mockResolvedValue({});
    const createEmailEventFn = vi.fn();

    const result = testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndLanguageByIdFn,
      publishFn,
      createEmailEventFn
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
    const getEmailAndLanguageByIdFn = vi.fn().mockRejectedValue(error);
    const publishFn = vi.fn().mockResolvedValue({});
    const createEmailEventFn = vi.fn();

    const result = testIt(
      validActionableEventRecord,
      incrementCounterFn,
      getEmailAndLanguageByIdFn,
      publishFn,
      createEmailEventFn
    );

    await expect(result).rejects.toThrow(
      new Error('(Re)-Throwing error on purpose to notify of batch item failure', error)
    );
  });

  function testIt(
    event: AuditTrailActionableEventFoundEvent | AuditTrailNoPhoneNumberForCalendarEventFoundEvent,
    incrementCounterFn: () => Promise<AlertStoreRecord<string, UserId>>,
    getEmailAndLanguageByIdFn: () => Promise<
      (Pick<UserStoreRecord<unknown>, 'Email'> & { Language: LanguageCode }) | undefined
    >,
    publishFn: () => Promise<void>,
    createEmailEventFn: () => EmailToBeSentEvent,
    config: AlertEndpointConfig &
      EmailingSenderEndpointConfig &
      AlertEmailEndpointConfig = validConfig
  ): Promise<void> {
    const alertsBaseStoreMock = {
      incrementCounter: incrementCounterFn
    } as unknown as AlertsBaseStore;
    const userBaseStoreMock = {
      getEmailAndLanguageById: getEmailAndLanguageByIdFn
    } as unknown as UserBaseStore<IdpName>;
    const snsServiceMock = {
      publish: publishFn
    } as unknown as SnsService;

    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(EmailTemplateService.prototype.createEmailEvent).mockImplementation(
      createEmailEventFn
    );

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
