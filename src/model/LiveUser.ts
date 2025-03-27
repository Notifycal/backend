import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { ReminderConfig } from '@notifycal/shared/schemas';

import type { Identity, IdpName } from '@notifycal/shared/types';

export interface UserCalendar {
  name: string;
  id: string;
}

export interface LiveUser<TIdpName extends IdpName> extends Identity<TIdpName> {
  config: ReminderConfig;
  idpAuthorization: AuthorizationForIdp<TIdpName>;
}
