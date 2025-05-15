import { logo } from '@email-templates/assets/logo.png.base64';
import type { LanguageCode } from '@notifycal/shared/types';
import { TemplateCompiler } from '@services/template-compiler';
import { writeFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { template } from './alert-missing-phone-number.html.hbs';
import { type EmailDynamicVariables, type EmailTextVariables, translations } from './translations';

describe('alert-missing-phone-number template', () => {
  it('should compile the template', () => {
    const templateCompiler = new TemplateCompiler();
    const compiledTemplate = templateCompiler.compile(template);

    expect(compiledTemplate).toBeInstanceOf(Function);

    const supportedLanguages: Array<LanguageCode> = ['en', 'es'];
    supportedLanguages.forEach((lang) => {
      const templateData: EmailTextVariables & EmailDynamicVariables = {
        ...translations(lang),
        logoSrc: `data:image/png;base64,${logo}`,
        notifycalFaqUrl: 'https://notifycal.com/faq'
      };
      writeFileSync(
        path.resolve(__dirname, `alert-missing-phone-number.${lang}.html`),
        compiledTemplate(templateData)
      );
    });
  });
});
