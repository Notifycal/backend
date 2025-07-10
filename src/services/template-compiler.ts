import type { Logger } from '@aws-lambda-powertools/logger';
import Handlebars from 'handlebars';
import { rethrowError } from './common/error-handling';

export class TemplateCompiler {
  public constructor(private readonly logger: Logger) {
    this.registerHelpers();
  }

  public compile(templateContent: string): Handlebars.TemplateDelegate {
    try {
      return Handlebars.compile(templateContent);
    } catch (error) {
      rethrowError(`Template could not be compiled`, error, this.logger);
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

  public registerPartial(name: string, template: string): void {
    Handlebars.registerPartial(name, template);
  }
}
