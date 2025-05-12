import { logger } from '@common/powertools';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailInlineAttachment } from '@model/app-events/EmailToBeSentEvent';
import type { EmailSendSuccessResponse } from '@model/vendor/mailgun/schemas';
import type { Email } from '@notifycal/shared/types';
import type { EmailAttachmentName, EmailHtmlBody, EmailSubject } from '@own-types/model';
import { throwError } from '@services/common/error-handling';
import { createHttpClient } from '@services/common/http-client';
import { capArray } from '@utils/array';
import { withIntegrationMetrics } from '@utils/withIntegrationMetrics';
import type { AxiosInstance } from 'axios';
import FormData from 'form-data';

// Docs: https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Messages/
export class EmailService {
  private readonly httpClient: AxiosInstance;

  public constructor(
    baseUrl: string,
    private readonly domainName: string,
    private readonly apiKey: string
  ) {
    this.httpClient = createHttpClient(
      baseUrl,
      {
        username: 'api',
        password: this.apiKey
      },
      'Mailgun(Email Service)'
    );
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
    attachmentsInline: Partial<Record<EmailAttachmentName, EmailInlineAttachment>> = {},
    tags: Array<string> = []
  ): Promise<EmailSendSuccessResponse> {
    const form = new FormData();
    form.append('from', this.flattenNameWithEmail(from));
    form.append('to', to);
    form.append('subject', subject);
    form.append('html', htmlBody);
    Object.entries(attachmentsInline).forEach(([name, attachment]) => {
      if (name && attachment) {
        form.append(`inline`, atob(attachment.base64Content), {
          filename: name,
          contentType: attachment.contentType
        });
      }
    });
    Object.entries(metadata).forEach(([key, value]) => {
      form.append(`v:${key}`, value);
    });
    // Docs: https://documentation.mailgun.com/docs/mailgun/user-manual/tracking-messages/#tags
    const { items: sanitizedTags, dropped: droppedTags } = capArray(tags, 10);
    if (droppedTags.length > 0) {
      logger.warn(`Tags list has been capped as it exceeds vendor 10 limit.`, {
        droppedTags
      });
    }
    sanitizedTags.forEach((tag) => {
      if (tag.length <= 128) {
        form.append(`o:tag`, tag);
      } else {
        logger.warn(`Tag ${tag} has not been included in vendor call has it exceeds vendor limits`);
      }
    });

    return withIntegrationMetrics('Mailgun', 'SendEmail', () =>
      this.httpClient.post(`/v3/${this.domainName}/messages`, form)
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
