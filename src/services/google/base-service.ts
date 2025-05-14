import { logger } from '@common/powertools';
import type { GoogleOAuthConfig } from '@model/Config';
import { withIntegrationMetrics } from '@services/observability/metrics';
import type {
  Gaxios,
  GaxiosInterceptor,
  GaxiosOptions,
  GaxiosPromise,
  GaxiosResponse
} from 'gaxios';
import { OAuth2Client } from 'google-auth-library';

export abstract class BaseGoogle {
  protected _client: OAuth2Client;
  protected _config: GoogleOAuthConfig;
  protected constructor(config: GoogleOAuthConfig, refreshToken?: string) {
    this._client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
    this._config = config;
    if (refreshToken) {
      // eslint-disable-next-line camelcase
      this._client.setCredentials({ refresh_token: refreshToken });
    }
    const axios = this._client.gaxios;
    if (axios) {
      this.setMetricsAdapter(axios);
      this.setInterceptors(axios);
    }
  }

  private setMetricsAdapter(gaxiosInstance: Gaxios): Gaxios {
    type GaxiosAdapter = <T>(
      options: GaxiosOptions,
      defaultAdapter: (options: GaxiosOptions) => GaxiosPromise<T>
    ) => GaxiosPromise<T>;

    const metricsAdapter: GaxiosAdapter = <T>(
      options: GaxiosOptions,
      defaultAdapter: (options: GaxiosOptions) => GaxiosPromise<T>
    ): GaxiosPromise<T> => {
      const operationId = this.extractOperationId(options);
      return withIntegrationMetrics(
        'google.com',
        operationId,
        (): GaxiosPromise<T> => defaultAdapter(options)
      );
    };
    gaxiosInstance.defaults.adapter = metricsAdapter;
    return gaxiosInstance;
  }

  private extractOperationId(options: GaxiosOptions): string {
    const method = (options.method || 'unknown').toUpperCase();
    const url = options.url?.toString() || 'UnknownUrl';
    return `${method} ${url}`;
  }

  protected setInterceptors(gaxios: Gaxios): void {
    const requestInterceptor: GaxiosInterceptor<GaxiosOptions> = {
      resolved: (config) => {
        logger.info('Google request', { requestConfig: config });
        return Promise.resolve(config);
      },
      rejected: (error) => {
        logger.error('Something unexpected went wrong prepping a request to Google', {
          requestError: error
        });
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
