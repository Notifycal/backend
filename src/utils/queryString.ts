import { parse, stringify } from 'qs';

export function objectToQueryString(obj: Record<string, unknown>): string {
  return stringify(obj);
}

export function queryStringToObject(queryString: string): Record<string, unknown> {
  return parse(queryString);
}

export function queryStringObjectToObject<T>(queryStringFlatObject: Record<string, string>): T {
  return parse(stringify(queryStringFlatObject)) as T;
}
