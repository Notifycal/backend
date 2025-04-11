import type { IdpConfigs } from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { CalendarEvent, CountryCode, Email, IdpName } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { describe, expect, it, vi } from 'vitest';
import { phoneNumberByEmail } from './contacts';
import { _findPhoneNumbersInText, phoneExtractor } from './phone-extractor';

vi.mock('@services/contacts');

describe('phoneExtractor', () => {
  const validAttendeeId = 'john@example.com' as Email;
  const validIdp = 'google' as IdpName;
  const validIdpAuthorization = {} as AuthorizationForIdp<IdpName>;
  const validIdpConfigs = {} as IdpConfigs;

  it('should extract and combine phone numbers from multiple sources preserving order', async () => {
    const validCalendarEvent = {
      summary: 'Meeting with John: +34611222333',
      description: 'Details and contact: +34644555666'
    };
    const validCountryCode = 'ES' as CountryCode;
    const phoneNumberByEmailFn = () => Promise.resolve(['+34677888999' as PhoneNumberE164]);

    const result = await testit(
      validCalendarEvent,
      validAttendeeId,
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
      validIdpConfigs
    );
    expect([...result]).toStrictEqual(['+34677888999', '+34644555666', '+34611222333']);
  });

  it('should handle empty calendar event fields', async () => {
    const validCalendarEvent = {
      summary: '',
      description: ''
    };
    const validCountryCode = 'ES' as CountryCode;
    const phoneNumberByEmailFn = () => Promise.resolve(['+34677888999' as PhoneNumberE164]);

    const result = await testit(
      validCalendarEvent,
      validAttendeeId,
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
      validIdpConfigs
    );
    expect([...result]).toStrictEqual(['+34677888999']);
  });

  it('should handle undefined calendar event fields', async () => {
    const validCalendarEvent = {};
    const validCountryCode = 'ES' as CountryCode;
    const phoneNumberByEmailFn = () => Promise.resolve(['+34677888999' as PhoneNumberE164]);

    const result = await testit(
      validCalendarEvent,
      validAttendeeId,
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
      validIdpConfigs
    );
    expect([...result]).toStrictEqual(['+34677888999']);
  });

  it('should handle no phone numbers found', async () => {
    const validCalendarEvent = {
      summary: 'Meeting with John',
      description: 'Details and contact info'
    };
    const validCountryCode = 'ES' as CountryCode;
    const phoneNumberByEmailFn = () => Promise.resolve([]);

    const result = await testit(
      validCalendarEvent,
      validAttendeeId,
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
      description: 'Details and contact: +34611222333'
    };
    const validCountryCode = 'ES' as CountryCode;
    const phoneNumberByEmailFn = () => Promise.resolve(['+34611222333' as PhoneNumberE164]);

    const result = await testit(
      validCalendarEvent,
      validAttendeeId,
      validCountryCode,
      validIdp,
      validIdpAuthorization,
      validIdpConfigs,
      phoneNumberByEmailFn
    );

    expect([...result]).toStrictEqual(['+34611222333']);
  });

  function testit(
    calendarEvent: Pick<CalendarEvent, 'summary' | 'description'>,
    attendeeId: Email,
    countryCode: CountryCode,
    idp: IdpName,
    idpAuthorization: AuthorizationForIdp<IdpName>,
    idpConfigs: IdpConfigs,
    phoneByEmailFn: () => Promise<Array<PhoneNumberE164>>
  ) {
    vi.mocked(phoneNumberByEmail).mockImplementation(phoneByEmailFn);

    return phoneExtractor(
      calendarEvent,
      attendeeId,
      countryCode,
      idp,
      idpAuthorization,
      idpConfigs
    );
  }
});

describe('_findPhoneNumbersInText', () => {
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
