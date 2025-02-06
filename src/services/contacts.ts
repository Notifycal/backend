import type { GoogleOAuthConfig, IdpConfigs } from '@model/Config';
import type { UserGoogleAuthorization } from '@model/IdpAuthorization';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import type { Email, IdpName, PhoneNumber } from '@notifycal/shared/types';
import { match } from 'ts-pattern';
import { GooglePeople } from './google/people';

function googlePhoneNumberBy(
  email: Email,
  idpAuthorization: UserGoogleAuthorization,
  idpConfig: GoogleOAuthConfig
): Promise<Array<PhoneNumber> | undefined> {
  return GooglePeople.withRefreshToken(idpConfig, idpAuthorization.refreshToken).getPhoneNumbersBy(
    email
  );
}

export function phoneNumberByEmail(
  email: Email,
  idpAuthorization: UserIdpAuthorizationStoreRecord<IdpName>,
  idp: IdpName,
  idpConfigs: IdpConfigs
): Promise<Array<PhoneNumber> | undefined> {
  return match(idp)
    .with('google.com', (idp) =>
      googlePhoneNumberBy(email, idpAuthorization.IdpAuthorization, idpConfigs[idp])
    )
    .exhaustive();
}
