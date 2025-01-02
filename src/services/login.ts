import type { User } from '@model/User';
import { UserBaseStore, type UserBaseStoreConfig } from './user-base-store';
import type { AwsConfig, EncodeAccessJwtConfig, EncodeRefreshJwtConfig } from '@model/Config';
import type { UserId } from '@own-types/model';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { successHandler } from './common/api-response-handlers';
import { type EncodedAndDecodedJwts, buildJwts } from './jwt';
import type { RefreshTokenBaseStore } from './refresh-token-base-store';

function signUpUser(email: string, userProvider: UserBaseStore): Promise<User> {
  const newUser = { UserId: email } as User;
  return userProvider.putUser(newUser).then(() => newUser);
}

export function signInOrUpUser(
  email: string,
  config: UserBaseStoreConfig,
  awsConfig: AwsConfig
): Promise<User> {
  const userProvider = new UserBaseStore(config, awsConfig);
  return userProvider.getUserByEmail(email).then(
    (userOrNot) => {
      if (userOrNot) {
        return userOrNot;
      } else {
        return signUpUser(email, userProvider);
      }
    },
    (error) => Promise.reject(`User with id '${email}' could not sign in. Error: ${error}`)
  );
}

export function buildJwtsAndStoreRefreshJwt(
  userId: UserId,
  encodeAccessJwtConfig: EncodeAccessJwtConfig,
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig,
  store: RefreshTokenBaseStore
): Promise<EncodedAndDecodedJwts> {
  return buildJwts(userId, encodeAccessJwtConfig, encodeRefreshJwtConfig).then((jwts) =>
    store
      .putToken({
        UserId: jwts.refreshToken.decoded.payload.sub,
        RefreshToken: jwts.refreshToken.encoded,
        RefreshTokenId: jwts.refreshToken.decoded.payload.jti,
        ExpiresAt: jwts.refreshToken.decoded.payload.exp + 1 // +1 just in case...
      })
      .then(() => jwts)
  );
}

export function _successHandler(jwts: EncodedAndDecodedJwts): APIGatewayProxyStructuredResultV2 {
  return successHandler()({
    accessToken: jwts.accessToken.encoded,
    tokenType: 'Bearer',
    refreshToken: jwts.refreshToken.encoded
  });
}