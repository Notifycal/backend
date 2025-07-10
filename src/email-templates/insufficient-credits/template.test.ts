import { testEmailTemplate } from '@email-templates/template-test-helper';
import { describe, it } from 'vitest';
import { insufficientCreditsPartialTemplate } from './insufficient-credits.html.hbs';
import { specificTranslations } from './translations';

describe('insufficient-credits template', () => {
  // eslint-disable-next-line vitest/expect-expect
  it('should compile the template', () => {
    testEmailTemplate(
      'insufficient-credits',
      {
        partialTemplate: insufficientCreditsPartialTemplate,
        specificTranslations,
        templateVariables: {
          topupUrl: 'https://app.notifycal.com/billing'
        }
      },
      __dirname
    );
  });
});
