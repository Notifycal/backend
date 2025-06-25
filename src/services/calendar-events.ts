import type { Logger } from '@aws-lambda-powertools/logger';
import type { GoogleOAuthConfig, IdpConfigs } from '@model/Config';
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
  idpAuthorization: UserGoogleAuthorization,
  config: GoogleOAuthConfig,
  logger: Logger
): Promise<ServiceResponse<CalendarEvent, ParsingError>> {
  return GoogleCalendar.withRefreshToken(
    config,
    idpAuthorization.refreshToken,
    logger
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
  idpAuthorization: AuthorizationForIdp<IdpName>,
  idp: IdpName,
  idpConfigs: IdpConfigs,
  logger: Logger
): Promise<ServiceResponse<CalendarEvent, ParsingError>> {
  return match(idp)
    .with('google.com', () =>
      googleEventsStartTimeWithin(
        calendarId,
        lowerBoundStartTime,
        upperBoundStartTime,
        includeAllDayEvents,
        idpAuthorization,
        idpConfigs[idp],
        logger
      )
    )
    .exhaustive();
}
