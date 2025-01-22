import type { OAuth2Client } from 'google-auth-library';

export abstract class BaseGoogle {
  protected _auth: OAuth2Client;

  protected constructor(auth: OAuth2Client) {
    this._auth = auth;
  }
}
