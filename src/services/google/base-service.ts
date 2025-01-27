import type { GoogleOAuthConfig } from '@model/Config';
import { OAuth2Client } from 'google-auth-library';

export abstract class BaseGoogle {
  protected _client: OAuth2Client;
  protected _config: GoogleOAuthConfig;

  protected constructor(config: GoogleOAuthConfig) {
    this._config = config;
    this._client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
  }
}
