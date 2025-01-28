import type { GoogleOAuthConfig } from '@model/Config';
import { OAuth2Client } from 'google-auth-library';

export abstract class BaseGoogle {
  protected _client: OAuth2Client;
  protected _config: GoogleOAuthConfig;

  protected constructor(config: GoogleOAuthConfig, refreshToken?: string) {
    this._config = config;
    this._client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
    if (refreshToken) {
      // eslint-disable-next-line camelcase
      this._client.setCredentials({ refresh_token: refreshToken });
    }
  }
}
