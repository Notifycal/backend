import { z } from 'zod';

export const calendarSchema = z.object({
  id: z.string().brand('CalendarId'),
  name: z.string().brand('CalendarName')
});

export type Calendar = z.infer<typeof calendarSchema>;
