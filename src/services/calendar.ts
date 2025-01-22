import type { Calendar } from '@model/Calendar';
import type { IdpName } from '@model/Identity';
import { match } from 'ts-pattern';
import { GoogleCalendar } from './google/calendar';
import type { IdpConfigs } from '@model/Config';

export function calendarList(idp: IdpName, configs: IdpConfigs): Promise<Array<Calendar>> {
  return match(idp)
    .with('google.com', (idp) => GoogleCalendar.withRefreshToken(configs[idp], '').calendarList())
    .exhaustive();
}
