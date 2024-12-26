import { Jwt, Uuid } from '@own-types/model';

export interface RefreshToken {
  UserId: Uuid;
  RefreshTokenId: string;
  RefreshToken: Jwt;
  ExpiresAt: number;
}
