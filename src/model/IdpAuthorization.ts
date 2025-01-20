interface UserGoogleAuthorization {
  refreshToken: string;
}

export type AuthorizationForIdp<TIdpName> = TIdpName extends 'google.com'
  ? UserGoogleAuthorization
  : // : TIdpName extends 'idpName2' // this is how you would implement it the second time
    //   ? IdpName2Authorization
    never;

export interface UserIdpAuthorization<TIdpName> {
  auth: AuthorizationForIdp<TIdpName>;
}
