import type { IdpConfigs } from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { CalendarEvent, CountryCode, Email, IdpName } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { allSettledAllOrErrorHandler, promiseTry } from '@utils/promises';
import { findPhoneNumbersInText } from 'libphonenumber-js';
import { phoneNumberByEmail } from './contacts';

export function _findPhoneNumbersInText(
  text: string,
  countryCode: CountryCode
): Promise<Array<PhoneNumberE164>> {
  return promiseTry(() =>
    findPhoneNumbersInText(text, {
      defaultCountry: countryCode
    }).map((results) => results.number.formatInternational() as PhoneNumberE164)
  );
}

export function phoneExtractor(
  calendarEvent: CalendarEvent,
  attendeeId: Email,
  senderCountryCode: CountryCode,
  idp: IdpName,
  idpAuthorization: AuthorizationForIdp<IdpName>,
  idpConfigs: IdpConfigs
): Promise<Set<PhoneNumberE164>> {
  const fromContactIntegrationPromise = phoneNumberByEmail(
    attendeeId,
    idpAuthorization,
    idp,
    idpConfigs
  );
  const fromCalendarEventTitlePromise = _findPhoneNumbersInText(
    calendarEvent.description || '',
    senderCountryCode
  );
  return Promise.allSettled([fromContactIntegrationPromise, fromCalendarEventTitlePromise])
    .then((results) => {
      return allSettledAllOrErrorHandler(
        results,
        'obtaining phone numbers from contact integration and calendar event title and merging them'
      );
    })
    .then(([phoneNumbers1, phoneNumbers2]) => {
      return new Set([...phoneNumbers1, ...phoneNumbers2]);
    });
}
