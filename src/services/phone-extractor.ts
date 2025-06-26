import type { Logger } from '@aws-lambda-powertools/logger';
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
    }).map((results) => results.number.formatInternational().replaceAll(' ', '') as PhoneNumberE164)
  );
}

export function phoneExtractor(
  calendarEvent: Pick<CalendarEvent, 'summary' | 'description' | 'attendees'>,
  senderCountryCode: CountryCode | undefined,
  idp: IdpName,
  idpAuthorization: AuthorizationForIdp<IdpName>,
  idpConfigs: IdpConfigs,
  logger: Logger
): Promise<Set<PhoneNumberE164>> {
  const fromContactIntegrationPromise = Promise.allSettled(
    calendarEvent.attendees.map((attendee) =>
      phoneNumberByEmail(attendee.id as Email, idpAuthorization, idp, idpConfigs, logger).then(
        (phoneNumbers) => (phoneNumbers.length > 0 ? [phoneNumbers[0]] : []) // if attendee has more than 1 phone number set, pick the first one.
      )
    )
  )
    .then((results) =>
      allSettledAllOrErrorHandler(
        results,
        'obtaining phone numbers from contact integration',
        logger
      )
    )
    .then((results) => results.flat());
  const fromCalendarEventSummaryPromise = _findPhoneNumbersInText(
    calendarEvent.summary || '',
    senderCountryCode || 'ES'
  );
  const fromCalendarEventDescriptionPromise = _findPhoneNumbersInText(
    calendarEvent.description || '',
    senderCountryCode || 'ES'
  );
  return Promise.allSettled([
    fromContactIntegrationPromise,
    fromCalendarEventDescriptionPromise,
    fromCalendarEventSummaryPromise
  ])
    .then((results) => {
      return allSettledAllOrErrorHandler(
        results,
        'obtaining phone numbers from contact integration, calendar event description and summary',
        logger
      );
    })
    .then((results) => new Set(results.flat()));
}
