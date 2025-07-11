import type { LanguageCode } from '@notifycal/shared/types';

export interface EmailTextVariables extends Record<string, string> {
  subject: string;
  header: string;
  greeting: string;
  mainMessage: string;
  tipTitle: string;
  tipContent: string;
  topupAction: string;
}

export interface EmailDynamicVariables {
  logoSrc: string;
  topupUrl: string;
}

export const specificTranslations: Record<LanguageCode, EmailTextVariables> = {
  es: {
    subject: 'Urgente: Créditos insuficientes - Recordatorio no enviado',
    header: 'Créditos insuficientes: Recordatorio no enviado',
    greeting: 'Estimado/a usuario/a,',
    mainMessage:
      'Lamentablemente, no pudimos enviar uno o más recordatorios programados debido a créditos insuficientes en su cuenta. Para reanudar el servicio de recordatorios, es necesario recargar su cuenta.',
    tipTitle: 'Acción Requerida',
    tipContent:
      'Recargue su cuenta inmediatamente para reanudar el envío de recordatorios y asegurar que sus citas no se pierdan.',
    topupAction: 'Recargar Cuenta Ahora'
  },
  en: {
    subject: 'Urgent: Insufficient Credits - Reminder Not Sent',
    header: 'Insufficient Credits: Reminder Not Sent',
    greeting: 'Dear user,',
    mainMessage:
      "Unfortunately, we couldn't send one or more scheduled reminders due to insufficient credits in your account. To resume reminder service, please top up your account.",
    tipTitle: 'Action Required',
    tipContent:
      'Top up your account immediately to resume sending reminders and ensure your appointments are not missed.',
    topupAction: 'Top Up Account Now'
  }
};
