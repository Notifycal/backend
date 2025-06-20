import type { JsonObject } from '@own-types/model';

export class ParsingError extends Error {
  public constructor(message: string, item: JsonObject) {
    super(message);
    this.name = 'ParsingError';
    this.item = item;
  }

  public item: JsonObject;
}

export class InsufficientCreditsError extends Error {
  public constructor(message: string, item: JsonObject, cause: unknown) {
    super(message);
    this.name = 'InsufficientCreditsError';
    this.item = item;
    this.cause = cause;
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
