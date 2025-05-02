import type { JsonObject } from '@own-types/model';

export class ParsingError extends Error {
  public constructor(message: string, item: JsonObject) {
    super(message);
    this.name = 'ParsingError';
    this.item = item;
  }

  public item: JsonObject;
}

export type MergedErrorResult = Error & {
  cause: {
    [key: string]: {
      message: string;
      name: string;
      stack?: string;
      cause?: unknown;
    };
  };
};
