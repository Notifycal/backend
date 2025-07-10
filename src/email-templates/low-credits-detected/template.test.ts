import { testEmailTemplate } from '@email-templates/template-test-helper';
import { describe, it } from 'vitest';
import { lowCreditsDetectedPartialTemplate } from './low-credits-detected.html.hbs';
import { specificTranslations } from './translations';

describe('low-credits-detected template', () => {
  // eslint-disable-next-line vitest/expect-expect
  it('should compile the template', () => {
    testEmailTemplate(
      'low-credits-detected',
      {
        partialTemplate: lowCreditsDetectedPartialTemplate,
        specificTranslations,
        templateVariables: {
          topupUrl: 'https://app.notifycal.com/billing'
        }
      },
      __dirname
    );
  });
});
