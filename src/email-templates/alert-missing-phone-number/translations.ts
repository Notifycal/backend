import type { LanguageCode } from '@notifycal/shared/types';

export interface EmailTextVariables extends Record<string, string> {
  subject: string;
  header: string;
  greeting: string;
  mainMessage: string;
  tipTitle: string;
  tipContent: string;
  visitNotifycalFaq: string;
  helpOffer: string;
  thankYou: string;
}

export interface EmailDynamicVariables {
  logoSrc: string;
  notifycalFaqUrl: string;
}

export const specificTranslations: Record<LanguageCode, EmailTextVariables> = {
  es: {
    subject: 'Alerta: Recordatorio no enviado',
    header: 'Importante: No pudimos enviar su recordatorio',
    greeting: 'Estimado/a usuario/a,',
    mainMessage:
      'Hemos detectado que uno o más recordatorios programados no pudieron ser enviados porque faltaba la información de contacto en los eventos de calendario correspondientes.',
    tipTitle: 'Solución',
    tipContent:
      'Para garantizar que todos sus recordatorios lleguen a su destino, asegúrese de que cada evento en su calendario incluya un número de teléfono o correo electrónico de contacto del destinatario.',
    visitNotifycalFaq: 'Para más información, consulte nuestra',
    helpOffer:
      '¿Necesita ayuda? Nuestro equipo está disponible para asistirle en la configuración correcta de sus eventos. Contáctenos en cualquier momento.',
    thankYou: '¡Gracias por confiar en Notifycal!'
  },
  en: {
    subject: 'Alert: Reminder Not Delivered',
    header: "Important: We couldn't send your reminder",
    greeting: 'Dear user,',
    mainMessage:
      "We've detected that one or more scheduled reminders could not be delivered because contact information was missing from the corresponding calendar events.",
    tipTitle: 'Solution',
    tipContent:
      'To ensure all your reminders reach their destination, please make sure each calendar event includes a phone number or email address for the recipient.',
    visitNotifycalFaq: 'For more details, check our',
    helpOffer:
      'Need assistance? Our team is ready to help you set up your events correctly. Feel free to contact us anytime.',
    thankYou: 'Thank you for choosing Notifycal!'
  }
};
