import type { AuthorizationForIdp } from '@model/IdpAuthorization';

import type { Identity, IdpName, ReminderConfig } from '@notifycal/shared/types';

export interface UserCalendar {
  name: string;
  id: string;
}

export interface LiveUser<TIdpName extends IdpName> extends Identity<TIdpName> {
  config: ReminderConfig;
  idpAuthorization: AuthorizationForIdp<TIdpName>;
}
