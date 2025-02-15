import type { GoogleOAuthConfig, IdpConfigs } from '@model/Config';
import type { Calendar, IdpName, UserId } from '@notifycal/shared/types';
import { throwError } from '@services/common/error-handling';
import { match } from 'ts-pattern';
import { GoogleCalendar } from './google/calendar';
import { type UserBaseStoreConfig, UserBaseStore } from './stores/user-base-store';

function googleCalendarList(
  userId: UserId,
  userBaseStoreConfig: UserBaseStoreConfig,
  config: GoogleOAuthConfig
): Promise<Array<Calendar>> {
  return UserBaseStore.withConfig(userBaseStoreConfig)
    .getIdpAuthorization(userId)
    .then((idpAuthorization) => {
      if (!idpAuthorization) {
        throwError(
          `Google Idp authorization could not be found in persistance for user id ${userId}`
        );
      }
      return GoogleCalendar.withRefreshToken(config, idpAuthorization.refreshToken).calendarList();
    });
}

export function calendarList(
  userId: UserId,
  idp: IdpName,
  idpConfigs: IdpConfigs,
  userBaseStoreConfig: UserBaseStoreConfig
): Promise<Array<Calendar>> {
  return match(idp)
    .with('google.com', () => googleCalendarList(userId, userBaseStoreConfig, idpConfigs[idp]))
    .exhaustive();
}
