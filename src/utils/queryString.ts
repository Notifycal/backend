import { parse, stringify } from 'qs';
import type { z } from 'zod';

export function objectToQueryString(obj: Record<string, unknown>): string {
  return stringify(obj);
}

export function queryStringToObject(queryString: string): Record<string, unknown> {
  return parse(queryString);
}

export function queryStringObjectToTypedObject<TSchema extends z.AnyZodObject>(
  queryStringFlatObject: Record<string, string>,
  schema: TSchema
): z.infer<typeof schema> {
  const raw = queryStringToObject(objectToQueryString(queryStringFlatObject));
  const result = schema.parse(raw);
  return result;
}
