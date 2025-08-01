import type { LanguageCode } from '@notifycal/shared/types';

export interface EmailCommonTranslations extends Record<string, string> {
  appName: string;
  helpOfferText: string;
  helpOfferLinkText: string;
  thankYou: string;
  rightsReserved: string;
}

export interface EmailCommonDynamicVariables extends Record<string, string> {
  feedbackUrl: string;
}

export const commonTranslations: Record<LanguageCode, EmailCommonTranslations> = {
  es: {
    appName: 'Notifycal',
    greeting: 'Estimado/a usuario/a,',
    helpOfferText:
      '¿Necesita ayuda o encontró algún problema? Visite nuestro formulario de feedback para obtener asistencia o reportar cualquier inconveniente.',
    helpOfferLinkText: 'Haz click aquí.',
    thankYou: '¡Gracias por confiar en Notifycal!',
    rightsReserved: 'Todos los derechos reservados'
  },
  en: {
    appName: 'Notifycal',
    greeting: 'Dear user,',
    helpOfferText:
      'Need assistance or found an issue? Visit our feedback form to get help or report any problems you encounter.',
    helpOfferLinkText: 'Click here.',
    thankYou: 'Thank you for choosing Notifycal!',
    rightsReserved: 'All rights reserved'
  },
  ca: {
    appName: 'Notifycal',
    greeting: 'Estimat/da usuari/a,',
    helpOfferText:
      'Necessiteu ajuda o heu trobat algun problema? Visiteu el nostre formulari de comentaris per obtenir assistència o informar de qualsevol inconvenient.',
    helpOfferLinkText: 'Feu clic aquí.',
    thankYou: 'Gràcies per confiar en Notifycal!',
    rightsReserved: 'Tots els drets reservats'
  }
};
