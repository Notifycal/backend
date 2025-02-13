import type { AuthorizationForIdp, UserGoogleAuthorization } from '@model/IdpAuthorization';
import type { Email, IdpName, PhoneNumber } from '@notifycal/shared/types';
import { match } from 'ts-pattern';
import { GooglePeople } from './google/people';

function googlePhoneNumberBy(
  email: Email,
  idpAuthorization: UserGoogleAuthorization
): Promise<Array<PhoneNumber>> {
  return GooglePeople.withRefreshToken(idpAuthorization.refreshToken).getPhoneNumbersBy(email);
}

export function phoneNumberByEmail(
  email: Email,
  idpAuthorization: AuthorizationForIdp<IdpName>,
  idp: IdpName
): Promise<Array<PhoneNumber>> {
  return match(idp)
    .with('google.com', () => googlePhoneNumberBy(email, idpAuthorization))
    .exhaustive();
}
