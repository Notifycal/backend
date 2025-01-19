import type { Jwt, UnixTimestamp, UserId, Uuid } from '@own-types/model';

export interface RefreshTokenStoreRecord {
  UserId: UserId;
  RefreshTokenId: Uuid;
  RefreshToken: Jwt;
  ExpiresAt: UnixTimestamp;
}
