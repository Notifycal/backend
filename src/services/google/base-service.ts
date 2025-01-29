import { logger } from '@common/powertools';
import type { GoogleOAuthConfig } from '@model/Config';
import type { GaxiosInterceptor, GaxiosOptions, GaxiosResponse } from 'gaxios';
import { OAuth2Client } from 'google-auth-library';

export abstract class BaseGoogle {
  protected _client: OAuth2Client;
  protected _config: GoogleOAuthConfig;

  protected constructor(config: GoogleOAuthConfig, refreshToken?: string) {
    this._config = config;
    this._client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
    const axios = this._client.gaxios;
    if (axios) {
      const requestInterceptor: GaxiosInterceptor<GaxiosOptions> = {
        resolved: (config) => {
          logger.info('Google successful request', { requestConfig: config });
          return Promise.resolve(config);
        },
        rejected: (error) => {
          logger.error('Google failed request', { requestError: error });
        }
      };
      const responseInterceptor: GaxiosInterceptor<GaxiosResponse> = {
        resolved: (config) => {
          logger.info('Google successful response', { responseConfig: config });
          return Promise.resolve(config);
        },
        rejected: (error) => {
          logger.error('Google failed response', { responseError: error });
        }
      };
      axios.interceptors.request.add(requestInterceptor);
      axios.interceptors.response.add(responseInterceptor);
    }
    if (refreshToken) {
      // eslint-disable-next-line camelcase
      this._client.setCredentials({ refresh_token: refreshToken });
    }
  }
}
