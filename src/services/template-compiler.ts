import { throwError } from '@services/common/error-handling';
import Handlebars from 'handlebars';

export class TemplateCompiler {
  public constructor() {
    this.registerHelpers();
  }

  public compile(templateContent: string): Handlebars.TemplateDelegate {
    try {
      return Handlebars.compile(templateContent);
    } catch (error) {
      throwError(`Template could not be compiled`, error);
    }
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('formatNumber', (value: number) => {
      return new Intl.NumberFormat().format(value);
    });

    Handlebars.registerHelper('formatPercent', (value: number) => {
      return new Intl.NumberFormat(undefined, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }).format(value / 100);
    });
  }
}
