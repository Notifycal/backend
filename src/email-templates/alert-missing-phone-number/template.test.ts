import { testEmailTemplate } from '@email-templates/template-test-helper';
import { describe, it } from 'vitest';
import { alertMissingPhoneNumberPartialTemplate } from './alert-missing-phone-number.html.hbs';
import { specificTranslations } from './translations';

describe('alert-missing-phone-number template', () => {
  // eslint-disable-next-line vitest/expect-expect
  it('should compile the template', () => {
    testEmailTemplate(
      'alert-missing-phone-number',
      {
        partialTemplate: alertMissingPhoneNumberPartialTemplate,
        specificTranslations,
        templateVariables: {
          notifycalFaqUrl: 'https://notifycal.com/faq'
        }
      },
      __dirname
    );
  });
});
