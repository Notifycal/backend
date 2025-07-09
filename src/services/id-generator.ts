import type { IdpName, Uuid } from '@notifycal/shared/types';
import { createHash } from 'crypto';
import { stringify, v5 } from 'uuid';

export function hashString(id: string): Uuid {
  const hash = createHash('sha256').update(id).digest();
  const uuidBytes = new Uint8Array(16);
  hash.subarray(0, 16).forEach((byte, index) => {
    uuidBytes[index] = byte;
  });

  uuidBytes[6] = (uuidBytes[6]! & 0x0f) | 0x40;
  uuidBytes[8] = (uuidBytes[8]! & 0x3f) | 0x80;

  return stringify(uuidBytes) as Uuid;
}

export function idGenerator(id: string, idpName: IdpName): Uuid {
  return v5(id, hashString(idpName)) as Uuid;
}
