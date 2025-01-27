export interface UserGoogleAuthorization {
  refreshToken: string;
}

export type AuthorizationForIdp<TIdpName> = TIdpName extends 'google.com'
  ? UserGoogleAuthorization
  : // : TIdpName extends 'idpName2' // this is how you would implement it the second time
    //   ? IdpName2Authorization
    unknown;

export interface UserIdpAuthorizationStoreRecord<TIdpName> {
  IdpAuthorization: AuthorizationForIdp<TIdpName>;
}
