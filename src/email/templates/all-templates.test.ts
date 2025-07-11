import { testEmailTemplate } from '@email/template-test-helper';
import { describe, it } from 'vitest';
import { alertMissingPhoneNumberPartialTemplate } from './alert-missing-phone-number/alert-missing-phone-number.html.hbs';
import { specificTranslations as alertMissingPhoneNumberTranslations } from './alert-missing-phone-number/translations';
import { insufficientCreditsPartialTemplate } from './insufficient-credits/insufficient-credits.html.hbs';
import { specificTranslations as insufficientCreditsTranslations } from './insufficient-credits/translations';
import { lowCreditsDetectedPartialTemplate } from './low-credits-detected/low-credits-detected.html.hbs';
import { specificTranslations as lowCreditsDetectedTranslations } from './low-credits-detected/translations';

const topupUrl = 'https://app.notifycal.com/billing';

const templates = [
  {
    name: 'low-credits-detected',
    partialTemplate: lowCreditsDetectedPartialTemplate,
    specificTranslations: lowCreditsDetectedTranslations,
    templateVariables: { topupUrl }
  },
  {
    name: 'insufficient-credits',
    partialTemplate: insufficientCreditsPartialTemplate,
    specificTranslations: insufficientCreditsTranslations,
    templateVariables: { topupUrl }
  },
  {
    name: 'alert-missing-phone-number',
    partialTemplate: alertMissingPhoneNumberPartialTemplate,
    specificTranslations: alertMissingPhoneNumberTranslations,
    templateVariables: { notifycalFaqUrl: 'https://notifycal.com/faq' }
  }
];

describe('all email templates', () => {
  // eslint-disable-next-line vitest/require-hook
  templates.forEach(({ name, partialTemplate, specificTranslations, templateVariables }) => {
    // eslint-disable-next-line vitest/expect-expect
    it(`should compile the ${name} template`, () => {
      testEmailTemplate(
        name,
        { partialTemplate, specificTranslations, templateVariables },
        __dirname + '/dist'
      );
    });
  });
});
