import type { Jwt, UnixTimestamp, UserId, Uuid } from '@notifycal/shared/types';

export interface RefreshTokenStoreRecord {
  UserId: UserId;
  RefreshTokenId: Uuid;
  RefreshToken: Jwt;
  ExpiresAt: UnixTimestamp;
}
