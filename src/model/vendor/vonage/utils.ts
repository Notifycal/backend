import type { VonageWebhookMessageStatusPayload } from './schemas';

// Docs: https://developer.vonage.com/en/api/messages#message-status
export function isTransientError(messageStatus: VonageWebhookMessageStatusPayload): boolean {
  const { status, error } = messageStatus;
  if (status !== 'rejected' && status !== 'undeliverable') {
    return false;
  }
  return error?.error?.detail
    ? ((): boolean => {
        const errorDetail = error.error.detail.toLowerCase();
        return (
          errorDetail.includes('temporarily') ||
          errorDetail.includes('retry') ||
          errorDetail.includes('rate limit') ||
          errorDetail.includes('throttl')
        );
      })()
    : false;
}
