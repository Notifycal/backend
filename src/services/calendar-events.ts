import type { GoogleOAuthConfig, IdpConfigs } from '@model/Config';
import type { UserGoogleAuthorization } from '@model/IdpAuthorization';
import type { ServiceResponse } from '@model/ServiceResponse';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import type { CalendarEvent, CalendarId, DateTime, IdpName } from '@notifycal/shared/types';
import { match } from 'ts-pattern';
import { GoogleCalendar } from './google/calendar';

function googleEventsStartTimeWithin(
  calendarId: CalendarId,
  lowerBoundStartTime: DateTime,
  upperBoundStartTime: DateTime,
  includeAllDayEvents: boolean,
  idpAuthorization: UserGoogleAuthorization,
  idpConfig: GoogleOAuthConfig
): Promise<ServiceResponse<CalendarEvent>> {
  return GoogleCalendar.withRefreshToken(
    idpConfig,
    idpAuthorization.refreshToken
  ).eventsStartTimeWithin(
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
  idpAuthorization: UserIdpAuthorizationStoreRecord<IdpName>,
  idp: IdpName,
  idpConfigs: IdpConfigs
): Promise<ServiceResponse<CalendarEvent>> {
  return match(idp)
    .with('google.com', (idp) =>
      googleEventsStartTimeWithin(
        calendarId,
        lowerBoundStartTime,
        upperBoundStartTime,
        includeAllDayEvents,
        idpAuthorization.IdpAuthorization,
        idpConfigs[idp]
      )
    )
    .exhaustive();
}
