import { logger } from '@common/powertools';
import type { GoogleOAuthConfig } from '@model/Config';
import type { Gaxios, GaxiosInterceptor, GaxiosOptions, GaxiosResponse } from 'gaxios';
import { OAuth2Client } from 'google-auth-library';

export abstract class BaseGoogle {
  protected setInterceptors(gaxios: Gaxios): void {
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
    gaxios.interceptors.request.add(requestInterceptor);
    gaxios.interceptors.response.add(responseInterceptor);
  }
}

export abstract class OAuthBaseGoogle extends BaseGoogle {
  protected _client: OAuth2Client;
  protected constructor(config: GoogleOAuthConfig) {
    super();
    this._client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
    const axios = this._client.gaxios;
    if (axios) {
      this.setInterceptors(axios);
    }
  }
}
export abstract class ImpersonatedBaseGoogle extends BaseGoogle {
  protected _client: OAuth2Client;
  protected constructor(refreshToken: string) {
    super();
    this._client = new OAuth2Client();
    // eslint-disable-next-line camelcase
    this._client.setCredentials({ refresh_token: refreshToken });
    const axios = this._client.gaxios;
    if (axios) {
      this.setInterceptors(axios);
    }
  }
}
