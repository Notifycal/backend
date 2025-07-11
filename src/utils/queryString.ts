import { promiseTry } from '@utils/promises';
import { parse, stringify } from 'qs';
import type { z } from 'zod';

export function objectToQueryString(obj: Record<string, unknown>): string {
  return stringify(obj);
}

export function queryStringToObject(queryString: string): Record<string, unknown> {
  return parse(queryString);
}

export function queryStringObjectToTypedObject<TSchema extends z.ZodObject>(
  queryStringFlatObject: Record<string, string>,
  schema: TSchema
): Promise<z.infer<typeof schema>> {
  return promiseTry(() => {
    const raw = queryStringToObject(objectToQueryString(queryStringFlatObject));
    return schema.parse(raw);
  });
}
