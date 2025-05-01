import { logger } from '@common/powertools';
import axios, { type AxiosBasicCredentials, type AxiosInstance } from 'axios';

function withInterceptors(axios: AxiosInstance, targetName: string): AxiosInstance {
  axios.interceptors.request.use(
    (config) => {
      logger.info(`${targetName} request`, { requestConfig: config });
      return config;
    },
    (error) => {
      logger.error(`Something unexpected went wrong prepping a request to ${targetName}`, {
        requestError: error
      });
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    (response) => {
      logger.info(`${targetName} successful response`, { responseConfig: response });
      return response;
    },
    (error) => {
      logger.error(`${targetName} failed response`, { responseError: error });
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      return Promise.reject(error);
    }
  );
  return axios;
}

export function createHttpClient(
  baseUrl: string,
  auth: AxiosBasicCredentials,
  target: string
): AxiosInstance {
  const _httpClient = axios.create({
    baseURL: baseUrl,
    auth: auth
  });
  return withInterceptors(_httpClient, target);
}
