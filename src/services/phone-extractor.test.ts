import { Logger } from '@aws-lambda-powertools/logger';
import { logger } from '@common/powertools';
import type { IdpConfigs } from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { CalendarEvent, CountryCode, Email, IdpName } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { describe, expect, it, vi } from 'vitest';
import { phoneNumberByEmail } from './contacts';
import { _findPhoneNumbersInText, phoneExtractor } from './phone-extractor';

vi.mock('@services/contacts');

describe(phoneExtractor, () => {
  const validIdp = 'google' as IdpName;
  const validIdpAuthorization = {} as AuthorizationForIdp<IdpName>;
  const validIdpConfigs = {} as IdpConfigs;
  const validAttendeeId = 'john@example.com' as Email;
  const validAttendee: CalendarEvent['attendees'][number] = {
    id: validAttendeeId
  };
  const validAttendee2: CalendarEvent['attendees'][number] = {
    id: 'paco@example.com' as Email
  };

  it('should extract and combine phone numbers from multiple sources preserving order', async () => {
    const validCalendarEvent = {
      summary: 'Meeting with John: +34611222333',
      description: 'Details and contact: +34644555666',
      attendees: [validAttendee, validAttendee2]
    };
    const validCountryCode = 'ES' as CountryCode;
    const phoneNumberByEmailFn = vi.fn(() => Promise.resolve(['+34677888999' as PhoneNumberE164]));

    const result = await testit(
      validCalendarEvent,
      validCountryCode,
      validIdp,
      validIdpAuthorization,
      validIdpConfigs,
      phoneNumberByEmailFn
    );

    expect(phoneNumberByEmail).toHaveBeenCalledWith(
      validAttendeeId,
      validIdpAuthorization,
      validIdp,
      validIdpConfigs,
      expect.any(Logger)
    );
    expect([...result]).toStrictEqual(['+34677888999', '+34644555666', '+34611222333']);
    expect(phoneNumberByEmailFn).toHaveBeenCalledTimes(2);
  });

  it('should return an empty list if attendees have no phone number', async () => {
    const validCalendarEvent = {
      id: 'event-1',
      attendees: [{ id: validAttendeeId }],
      isAllDayEvent: false,
      startTime: '2024-01-02T15:05:00Z',
      timeZone: 'Europe/Madrid'
    };
    const validCountryCode = 'ES' as CountryCode;
    const phoneNumberByEmailFn = vi.fn(() => Promise.resolve([]));

    const result = await testit(
      validCalendarEvent,
      validCountryCode,
      validIdp,
      validIdpAuthorization,
      validIdpConfigs,
      phoneNumberByEmailFn
    );

    expect(phoneNumberByEmail).toHaveBeenCalledWith(
      validAttendeeId,
      validIdpAuthorization,
      validIdp,
      validIdpConfigs,
      expect.any(Logger)
    );
    expect([...result]).toStrictEqual([]);
    expect(phoneNumberByEmailFn).toHaveBeenCalledTimes(1);
  });

  it('should handle empty calendar event fields', async () => {
    const validCalendarEvent = {
      summary: '',
      description: '',
      attendees: []
    };
    const validCountryCode = 'ES' as CountryCode;
    const phoneNumberByEmailFn = vi.fn();

    const result = await testit(
      validCalendarEvent,
      validCountryCode,
      validIdp,
      validIdpAuthorization,
      validIdpConfigs,
      phoneNumberByEmailFn
    );

    expect(phoneNumberByEmail).toHaveBeenCalledTimes(0);
    expect([...result]).toStrictEqual([]);
  });

  it('should handle undefined calendar event fields', async () => {
    const validCalendarEvent = {
      summary: undefined,
      description: undefined,
      attendees: []
    };
    const validCountryCode = 'ES' as CountryCode;
    const phoneNumberByEmailFn = vi.fn();

    const result = await testit(
      validCalendarEvent,
      validCountryCode,
      validIdp,
      validIdpAuthorization,
      validIdpConfigs,
      phoneNumberByEmailFn
    );

    expect(phoneNumberByEmail).toHaveBeenCalledTimes(0);
    expect([...result]).toStrictEqual([]);
  });

  it('should handle no phone numbers found', async () => {
    const validCalendarEvent = {
      summary: 'Meeting with John',
      description: 'Details and contact info',
      attendees: []
    };
    const validCountryCode = 'ES' as CountryCode;
    const phoneNumberByEmailFn = () => Promise.resolve([]);

    const result = await testit(
      validCalendarEvent,
      validCountryCode,
      validIdp,
      validIdpAuthorization,
      validIdpConfigs,
      phoneNumberByEmailFn
    );

    expect([...result]).toStrictEqual([]);
  });

  it('should deduplicate phone numbers from different sources', async () => {
    const validCalendarEvent = {
      summary: 'Meeting with John: +34611222333',
      description: 'Details and contact: +34611222333',
      attendees: [validAttendee]
    };
    const validCountryCode = 'ES' as CountryCode;
    const phoneNumberByEmailFn = () => Promise.resolve(['+34611222333' as PhoneNumberE164]);

    const result = await testit(
      validCalendarEvent,
      validCountryCode,
      validIdp,
      validIdpAuthorization,
      validIdpConfigs,
      phoneNumberByEmailFn
    );

    expect([...result]).toStrictEqual(['+34611222333']);
  });

  it('should fail if obtaining a phone number from an attendee fails', async () => {
    const validCalendarEvent = {
      summary: 'Meeting with John: +34611222333',
      description: 'Details and contact: +34644555666',
      attendees: [validAttendee]
    };
    const validCountryCode = 'ES' as CountryCode;
    const error = new Error('Failed to get phone number');
    const phoneNumberByEmailFn = vi.fn(() => Promise.reject(error));

    const result = testit(
      validCalendarEvent,
      validCountryCode,
      validIdp,
      validIdpAuthorization,
      validIdpConfigs,
      phoneNumberByEmailFn
    );

    await expect(result).rejects.toThrow(
      'There were 1 failures to obtaining phone numbers from contact integration, calendar event description and summary. Successes: 2. Total: 3. All results:'
    );
    expect(phoneNumberByEmail).toHaveBeenCalledWith(
      validCalendarEvent.attendees[0].id,
      validIdpAuthorization,
      validIdp,
      validIdpConfigs,
      expect.any(Logger)
    );
    expect(phoneNumberByEmailFn).toHaveBeenCalledOnce();
  });

  function testit(
    calendarEvent: Pick<CalendarEvent, 'summary' | 'description' | 'attendees'>,
    countryCode: CountryCode,
    idp: IdpName,
    idpAuthorization: AuthorizationForIdp<IdpName>,
    idpConfigs: IdpConfigs,
    phoneByEmailFn: () => Promise<Array<PhoneNumberE164>>
  ) {
    vi.mocked(phoneNumberByEmail).mockImplementation(phoneByEmailFn);

    return phoneExtractor(calendarEvent, countryCode, idp, idpAuthorization, idpConfigs, logger);
  }
});

describe(_findPhoneNumbersInText, () => {
  it('should extract phone numbers from text using default country code', async () => {
    const text = 'Text with phones: 612345678 and 698765432';
    const countryCode = 'ES' as CountryCode;

    const result = await testit(text, countryCode);

    expect(result).toStrictEqual(['+34612345678', '+34698765432']);
  });

  it('should extract phone numbers from text in different formats', async () => {
    const text = 'Text with phones: 612 345 678 and 698 76 54 32';
    const countryCode = 'ES' as CountryCode;

    const result = await testit(text, countryCode);

    expect(result).toStrictEqual(['+34612345678', '+34698765432']);
  });

  it('should return empty array if no phone numbers in text', async () => {
    const text = 'Text without phones';
    const countryCode = 'ES' as CountryCode;

    const result = await testit(text, countryCode);

    expect(result).toStrictEqual([]);
  });

  it('should handle empty text correctly', async () => {
    const text = '';
    const countryCode = 'ES' as CountryCode;

    const result = await testit(text, countryCode);

    expect(result).toStrictEqual([]);
  });

  it('should handle different country codes', async () => {
    const text = 'Text with phone numbers: 2025550123';
    const countryCode = 'US' as CountryCode;

    const result = await testit(text, countryCode);

    expect(result).toStrictEqual(['+12025550123']);
  });

  it('should handle multiple phone numbers with different formats', async () => {
    const text = 'Contact us at (202) 555-0123 or +34 611 222 333';
    const countryCode = 'US' as CountryCode;

    const result = await testit(text, countryCode);

    expect(result).toStrictEqual(['+12025550123', '+34611222333']);
  });

  function testit(text: string, countryCode: CountryCode) {
    return _findPhoneNumbersInText(text, countryCode);
  }
});
