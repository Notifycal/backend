import { Jwt, Uuid } from '@own-types/model';

export interface RefreshTokenStoreRecord {
  UserId: Uuid;
  RefreshTokenId: string;
  RefreshToken: Jwt;
  ExpiresAt: number;
}
