import type { LanguageCode } from '@notifycal/shared/types';

export interface EmailTextVariables extends Record<string, string> {
  subject: string;
  header: string;
  greeting: string;
  mainMessage: string;
  tipTitle: string;
  tipContent: string;
  topupAction: string;
  helpOffer: string;
  thankYou: string;
}

export interface EmailDynamicVariables {
  logoSrc: string;
  topupUrl: string;
}

export const specificTranslations: Record<LanguageCode, EmailTextVariables> = {
  es: {
    subject: 'Alerta: Créditos bajos detectados',
    header: 'Importante: Sus créditos están disminuyendo',
    greeting: 'Estimado/a usuario/a,',
    mainMessage:
      'Hemos detectado que sus créditos están disminuyendo. Para evitar interrupciones en el servicio de recordatorios, le recomendamos que recargue su cuenta pronto.',
    tipTitle: 'Acción Recomendada',
    tipContent:
      'Recargue su cuenta ahora para asegurar que todos sus recordatorios programados se envíen sin interrupciones.',
    topupAction: 'Recargar Cuenta',
    helpOffer:
      '¿Necesita ayuda? Nuestro equipo está disponible para asistirle con cualquier pregunta sobre créditos o facturación. Contáctenos en cualquier momento.',
    thankYou: '¡Gracias por confiar en Notifycal!'
  },
  en: {
    subject: 'Alert: Low Credits Detected',
    header: 'Important: Your credits are running low',
    greeting: 'Dear user,',
    mainMessage:
      "We've detected that your credits are running low. To avoid interruptions in your reminder service, we recommend topping up your account soon.",
    tipTitle: 'Recommended Action',
    tipContent:
      'Top up your account now to ensure all your scheduled reminders are sent without interruption.',
    topupAction: 'Top Up Account',
    helpOffer:
      'Need assistance? Our team is ready to help you with any questions about credits or billing. Feel free to contact us anytime.',
    thankYou: 'Thank you for choosing Notifycal!'
  }
};
