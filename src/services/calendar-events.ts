import type { ParsingError } from '@model/Errors';
import type { AuthorizationForIdp, UserGoogleAuthorization } from '@model/IdpAuthorization';
import type { ServiceResponse } from '@model/ServiceResponse';
import type { CalendarEvent, CalendarId, DateTime, IdpName } from '@notifycal/shared/types';
import { match } from 'ts-pattern';
import { GoogleCalendar } from './google/calendar';

function googleEventsStartTimeWithin(
  calendarId: CalendarId,
  lowerBoundStartTime: DateTime,
  upperBoundStartTime: DateTime,
  includeAllDayEvents: boolean,
  idpAuthorization: UserGoogleAuthorization
): Promise<ServiceResponse<CalendarEvent, ParsingError>> {
  return GoogleCalendar.withRefreshToken(idpAuthorization.refreshToken).eventsStartTimeWithin(
    calendarId,
    lowerBoundStartTime,
    upperBoundStartTime,
    includeAllDayEvents
  );
}

export function eventsStartTimeWithin(
  calendarId: CalendarId,
  lowerBoundStartTime: DateTime,
  upperBoundStartTime: DateTime,
  includeAllDayEvents: boolean,
  idpAuthorization: AuthorizationForIdp<IdpName>,
  idp: IdpName
): Promise<ServiceResponse<CalendarEvent, ParsingError>> {
  return match(idp)
    .with('google.com', () =>
      googleEventsStartTimeWithin(
        calendarId,
        lowerBoundStartTime,
        upperBoundStartTime,
        includeAllDayEvents,
        idpAuthorization
      )
    )
    .exhaustive();
}
