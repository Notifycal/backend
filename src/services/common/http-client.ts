import { logger } from '@common/powertools';
import { type IntegrationVendorName, withIntegrationMetrics } from '@utils/withIntegrationMetrics';
import axios, {
  type AxiosAdapter,
  type AxiosBasicCredentials,
  type AxiosInstance,
  type InternalAxiosRequestConfig
} from 'axios';

function extractOperationId(config: InternalAxiosRequestConfig): string {
  const method = (config.method || 'unknown').toUpperCase();
  const url = config.url || 'unknownUrl';
  return `${method} ${url}`;
}

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

function withMetricsAdapter(
  axiosInstance: AxiosInstance,
  targetName: IntegrationVendorName
): AxiosInstance {
  const originalAdapter = axios.getAdapter(axiosInstance.defaults.adapter);
  const withMetricsAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const operationId = extractOperationId(config);
    return withIntegrationMetrics(targetName, operationId, () => originalAdapter(config));
  };
  axiosInstance.defaults.adapter = withMetricsAdapter;
  return axiosInstance;
}

export function createHttpClient(
  baseUrl: string,
  auth: AxiosBasicCredentials,
  target: IntegrationVendorName
): AxiosInstance {
  const _httpClient = axios.create({
    baseURL: baseUrl,
    auth: auth
  });
  return withMetricsAdapter(withInterceptors(_httpClient, target), target);
}
