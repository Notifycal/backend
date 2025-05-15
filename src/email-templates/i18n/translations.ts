import type { LanguageCode } from '@notifycal/shared/types';

export interface NotifycalTranslations {
  appName: string;
  rightsReserved: string;
}

export const commonTranslations: Record<LanguageCode, NotifycalTranslations> = {
  en: {
    appName: 'Notifycal',
    rightsReserved: 'All rights reserved'
  },
  es: {
    appName: 'Notifycal',
    rightsReserved: 'Todos los derechos reservados'
  }
};
