import type { Logger } from '@aws-lambda-powertools/logger';
import type { GoogleOAuthConfig } from '@model/Config';
import type { Gaxios, GaxiosInterceptor, GaxiosOptions, GaxiosResponse } from 'gaxios';
import { OAuth2Client } from 'google-auth-library';

type BaseGoogleOptions = {
  refreshToken?: string;
  originHeaderValue?: string;
};

export abstract class BaseGoogle {
  protected _client: OAuth2Client;
  protected _config: GoogleOAuthConfig;
  protected constructor(
    config: GoogleOAuthConfig,
    protected readonly logger: Logger,
    options: BaseGoogleOptions = {}
  ) {
    const { originHeaderValue, refreshToken } = options;

    if (originHeaderValue && !config.redirectUriList.includes(originHeaderValue)) {
      throw new Error('Invalid Google OAuth redirect_uri');
    }

    this._client = new OAuth2Client(config.clientId, config.clientSecret, originHeaderValue);
    this._config = config;
    if (refreshToken) {
      // eslint-disable-next-line camelcase
      this._client.setCredentials({ refresh_token: refreshToken });
    }
    const axios = this._client.gaxios;
    if (axios) {
      this.setInterceptors(axios);
    }
  }

  protected setInterceptors(gaxios: Gaxios): void {
    const requestInterceptor: GaxiosInterceptor<GaxiosOptions> = {
      resolved: (config) => {
        this.logger.info('Google request', { requestConfig: config });
        return Promise.resolve(config);
      },
      rejected: (error) => {
        this.logger.error('Something unexpected went wrong prepping a request to Google', {
          requestError: error
        });
      }
    };
    const responseInterceptor: GaxiosInterceptor<GaxiosResponse> = {
      resolved: (config) => {
        this.logger.info('Google successful response', { responseConfig: config });
        return Promise.resolve(config);
      },
      rejected: (error) => {
        this.logger.error('Google failed response', { responseError: error });
      }
    };
    gaxios.interceptors.request.add(requestInterceptor);
    gaxios.interceptors.response.add(responseInterceptor);
  }
}
