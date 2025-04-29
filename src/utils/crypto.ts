import type { Base64Event } from '@lambdas/sqs/send-email';

export function toBase64(object: object): string {
  const jsonString = JSON.stringify(object);
  return Buffer.from(jsonString).toString('base64') as Base64Event;
}
