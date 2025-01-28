import type { Calendar } from '@model/Calendar';
import type { GoogleOAuthConfig, IdpConfigs } from '@model/Config';
import type { IdpName } from '@model/Identity';
import type { UserId } from '@own-types/model';
import { throwError } from '@services/common/error-handling';
import { match } from 'ts-pattern';
import { GoogleCalendar } from './google/calendar';
import { type UserBaseStoreConfig, UserBaseStore } from './user-base-store';

function googleCalendarList(
  userId: UserId,
  idpConfig: GoogleOAuthConfig,
  userBaseStoreConfig: UserBaseStoreConfig
): Promise<Array<Calendar>> {
  return UserBaseStore.withConfig(userBaseStoreConfig)
    .getIdpAuthorization(userId)
    .then((idpAuthorization) => {
      if (!idpAuthorization) {
        throwError(
          `Google Idp authorization could not be found in persistance for user id ${userId}`
        );
      }
      return GoogleCalendar.withRefreshToken(
        idpConfig,
        idpAuthorization.refreshToken
      ).calendarList();
    });
}

export function calendarList(
  userId: UserId,
  idp: IdpName,
  idpConfigs: IdpConfigs,
  userBaseStoreConfig: UserBaseStoreConfig
): Promise<Array<Calendar>> {
  return match(idp)
    .with('google.com', (idp) => googleCalendarList(userId, idpConfigs[idp], userBaseStoreConfig))
    .exhaustive();
}
