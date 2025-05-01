import type { Url } from '@own-types/model';

export interface MailgunConfig {
  apiKey: string;
  baseUrl: Url;
  domainName: string;
}
export interface MailgunEndpointConfig {
  mailgunConfig: MailgunConfig;
}
