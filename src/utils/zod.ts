import z from 'zod';

export function coerzableNumberSchema(coerced: boolean): z.ZodNumber {
  return coerced ? z.coerce.number() : z.number();
}
