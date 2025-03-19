import type { GoogleOAuthConfig, IdpConfigs } from '@model/Config';
import type { AuthorizationForIdp, UserGoogleAuthorization } from '@model/IdpAuthorization';
import type { Email, IdpName } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { match } from 'ts-pattern';
import { GooglePeople } from './google/people';

function googlePhoneNumberBy(
  email: Email,
  idpAuthorization: UserGoogleAuthorization,
  config: GoogleOAuthConfig
): Promise<Array<PhoneNumberE164>> {
  return GooglePeople.withRefreshToken(config, idpAuthorization.refreshToken).getPhoneNumbersBy(
    email
  );
}

export function phoneNumberByEmail(
  email: Email,
  idpAuthorization: AuthorizationForIdp<IdpName>,
  idp: IdpName,
  idpConfigs: IdpConfigs
): Promise<Array<PhoneNumberE164>> {
  return match(idp)
    .with('google.com', () => googlePhoneNumberBy(email, idpAuthorization, idpConfigs[idp]))
    .exhaustive();
}
