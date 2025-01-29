import type { AuthorizationForIdp } from '@model/IdpAuthorization';

export interface UserIdpAuthorizationStoreRecord<TIdpName> {
  IdpAuthorization: AuthorizationForIdp<TIdpName>;
}
