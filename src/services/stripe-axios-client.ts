import type { AxiosInstance, AxiosResponse } from 'axios';
import type Stripe from 'stripe';

class AxiosHttpClientResponse implements Stripe.HttpClientResponse<AxiosResponse> {
  private readonly response: AxiosResponse;

  public constructor(response: AxiosResponse) {
    this.response = response;
  }

  public getStatusCode(): number {
    return this.response.status;
  }

  public getHeaders(): { [key: string]: string } {
    const headers: { [key: string]: string } = {};
    Object.entries(this.response.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      } else if (value !== undefined && value !== null) {
        headers[key] = String(value);
      }
    });
    return headers;
  }

  public getRawResponse(): AxiosResponse {
    return this.response;
  }

  public toStream(): unknown {
    throw new Error('Not implemented');
  }

  public toJSON(): Promise<object> {
    if (typeof this.response.data === 'object') {
      return Promise.resolve(this.response.data);
    }
    return Promise.resolve(JSON.parse(this.response.data as string));
  }
}

export class AxiosHttpClient implements Stripe.HttpClient<AxiosHttpClientResponse> {
  private readonly axiosInstance: AxiosInstance;

  public constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  public getClientName(): string {
    return this.axiosInstance.name;
  }

  public async makeRequest(
    host: string,
    port: string | number,
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    headers: object,
    requestData: string | null,
    protocol: Stripe.HttpProtocol,
    timeout: number
  ): Promise<AxiosHttpClientResponse> {
    const url = `${protocol}://${host}${port ? ':' + port : ''}${path}`;

    return this.axiosInstance
      .request({
        method,
        url,
        headers: headers,
        data: requestData,
        timeout,
        responseType: 'text',
        restResourceName: path
      })
      .then(
        (response) => new AxiosHttpClientResponse(response),
        (error) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (error.response) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            return new AxiosHttpClientResponse(error.response);
          }
          throw error;
        }
      );
  }
}
