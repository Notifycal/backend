import { logger } from '@common/powertools';
import {
  type IntegrationVendorName,
  withIntegrationMetrics
} from '@services/observability/metrics';
import axios, {
  type AxiosBasicCredentials,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    restResourceName: string;
  }
}

interface RequestWithrestResourceName extends Omit<AxiosRequestConfig, 'restResourceName'> {
  restResourceName: string;
}

export class HttpClient {
  private readonly axiosInstance: AxiosInstance;

  public constructor(
    baseUrl: string | undefined,
    auth: AxiosBasicCredentials | undefined,
    targetName: IntegrationVendorName
  ) {
    this.axiosInstance = axios.create({
      ...(baseUrl && { baseUrl: baseUrl }),
      ...(auth && { auth: auth }),
      restResourceName: 'notused'
    });
    this.withInterceptors(this.axiosInstance, targetName);
    this.withMetricsAdapter(this.axiosInstance, targetName);
  }

  private withInterceptors(axiosInstance: AxiosInstance, targetName: IntegrationVendorName): void {
    axiosInstance.interceptors.request.use(
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

    this.axiosInstance.interceptors.response.use(
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
  }

  private withMetricsAdapter(
    axiosInstance: AxiosInstance,
    targetName: IntegrationVendorName
  ): void {
    const originalAdapter = axios.getAdapter(axiosInstance.defaults.adapter);
    function metricsAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
      return withIntegrationMetrics(
        targetName,
        `${config.method?.toUpperCase()} ${config.restResourceName}`,
        () => originalAdapter(config)
      );
    }
    axiosInstance.defaults.adapter = metricsAdapter;
  }

  private async request<T>(config: RequestWithrestResourceName): Promise<AxiosResponse<T>> {
    return this.axiosInstance.request<T>(config);
  }

  public async get<T>(
    url: string,
    restResourceName: string,
    config: Omit<AxiosRequestConfig, 'url' | 'method' | 'restResourceName'> = {}
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'get',
      restResourceName
    });
  }

  public async post<T>(
    url: string,
    restResourceName: string,
    data?: object,
    config: Omit<AxiosRequestConfig, 'url' | 'method' | 'data' | 'restResourceName'> = {}
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'post',
      data,
      restResourceName
    });
  }

  public async put<T>(
    url: string,
    restResourceName: string,
    data?: object,
    config: Omit<AxiosRequestConfig, 'url' | 'method' | 'data' | 'restResourceName'> = {}
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'put',
      data,
      restResourceName
    });
  }

  public async delete<T>(
    url: string,
    restResourceName: string,
    config: Omit<AxiosRequestConfig, 'url' | 'method' | 'restResourceName'> = {}
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'delete',
      restResourceName
    });
  }

  public async patch<T>(
    url: string,
    restResourceName: string,
    data?: object,
    config: Omit<AxiosRequestConfig, 'url' | 'method' | 'data' | 'restResourceName'> = {}
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'patch',
      data,
      restResourceName
    });
  }

  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}
