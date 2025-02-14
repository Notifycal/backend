import type { z } from 'zod';
import { baseEventSchema } from './BaseEvent';

export const baseErrorEventSchema = baseEventSchema;

export type BaseErrorEvent = z.infer<typeof baseErrorEventSchema>;
