import { User } from '@model/User';
import { UserBaseStoreConfig, UserBaseStore } from './user-base-store';
import { AwsConfig } from '@model/Config';

export function signInOrUpUser(
  email: string,
  config: UserBaseStoreConfig,
  awsConfig: AwsConfig
): Promise<User> {
  const userProvider = new UserBaseStore(config, awsConfig);
  return userProvider.getUserByEmail(email).catch(() => {
    const newUser = { UserId: email } as User;
    return userProvider.putUser(newUser).then(() => newUser);
  });
}
