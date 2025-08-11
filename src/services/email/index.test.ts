import { logger } from '@common/powertools';
import type { Email } from '@notifycal/shared/types';
import type { EmailHtmlBody, EmailSubject } from '@own-types/model';
import { describe, expect, it } from 'vitest';
import { EmailService } from '.';
import { input } from './email';
import { attachements } from './logo';

describe('email', () => {
  it('ok', async () => {
    const service = new EmailService(
      `https://api.eu.mailgun.net`,
      `nonprod.notifycal.com`,
      ``,
      logger
    );

    const transformed = input;

    const result = await service.sendEmail(
      {
        name: 'Sergio Test',
        email: 'info@nonprod.notifycal.com' as Email
      },
      'notifycal@gmail.com' as Email,
      `Urgente: Créditos insuficientes - Recordatorio no enviado` as EmailSubject,
      transformed as EmailHtmlBody,
      {}, // metadata
      attachements // attachmentsInline
    );

    expect(result).toBe('buuu');
  });
});
