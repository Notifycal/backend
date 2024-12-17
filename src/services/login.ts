import { User } from 'model/User';
import { UserProviderConfig, UserProvider } from './users-provider';
import { AwsConfig } from 'model/AwsConfig';

export function signInOrUpUser(
  email: string,
  config: UserProviderConfig,
  awsConfig: AwsConfig
): Promise<User> {
  const userProvider = new UserProvider(config, awsConfig);
  return userProvider.getUserByEmail(email).catch(() => {
    const newUser = { UserId: email } as User;
    return userProvider.putUser(newUser).then(() => newUser);
  });
}
