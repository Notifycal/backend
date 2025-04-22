import { logger } from '@common/powertools';
import type { AxiosInstance } from 'axios';

export function withInterceptors(axios: AxiosInstance, targetName: string): AxiosInstance {
  axios.interceptors.request.use(
    (config) => {
      logger.info(`${targetName} successful request`, { requestConfig: config });
      return config;
    },
    (error) => {
      logger.error(`${targetName} failed request`, { requestError: error });
      return Promise.reject(
        new Error(`There was an error adding a request interceptor for ${targetName}`, {
          cause: error
        })
      );
    }
  );

  axios.interceptors.response.use(
    (response) => {
      logger.info(`${targetName} successful response`, { responseConfig: response });
      return response;
    },
    (error) => {
      logger.error(`${targetName} failed response`, { responseError: error });
      return Promise.reject(
        new Error(`There was an error adding a response interceptor for ${targetName}`, {
          cause: error
        })
      );
    }
  );
  return axios;
}
