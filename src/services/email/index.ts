import { logger } from '@common/powertools';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailSendSuccessResponse } from '@model/vendor/mailgun';
import type { Email } from '@notifycal/shared/types';
import type { EmailHtmlBody, EmailSubject } from '@own-types/model';
import { throwError } from '@services/common/error-handling';
import { withInterceptors } from '@utils/axios';
import { withIntegrationMetrics } from '@utils/withIntegrationMetrics';
import axios, { type AxiosInstance } from 'axios';
import FormData from 'form-data';

// Docs: https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Messages/
export class EmailService {
  private readonly httpClient: AxiosInstance;

  public constructor(
    private readonly baseUrl: string,
    private readonly domainName: string,
    private readonly apiKey: string
  ) {
    this.baseUrl = baseUrl;
    const _httpClient = axios.create({
      auth: {
        username: 'api',
        password: this.apiKey
      }
    });
    this.httpClient = withInterceptors(_httpClient, 'Mailgun(Email Service)');
  }

  private flattenNameWithEmail(emailWithName: EmailWithName): string {
    return `${emailWithName.name} <${emailWithName.email}>`;
  }

  public async sendEmail(
    from: EmailWithName,
    to: Email,
    subject: EmailSubject,
    htmlBody: EmailHtmlBody,
    metadata: Record<string, string> = {},
    tags: Array<string> = []
  ): Promise<EmailSendSuccessResponse> {
    const form = new FormData();
    form.append('from', this.flattenNameWithEmail(from));
    form.append('to', to);
    form.append('subject', subject);
    form.append('html', htmlBody);
    Object.entries(metadata).forEach(([key, value]) => {
      form.append(`v:${key}`, value);
    });
    tags.forEach((tag) => {
      form.append(`o:tag`, tag);
    });

    return withIntegrationMetrics('Mailgun', 'SendEmail', () =>
      this.httpClient.post(`${this.baseUrl}/v3/${this.domainName}/messages`, form)
    )
      .then((response) => {
        logger.info('Email response:', { response });
        return response.data as EmailSendSuccessResponse;
      })
      .catch((error) => {
        throwError('Email error', error);
      });
  }
}
