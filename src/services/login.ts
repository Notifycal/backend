import { User } from 'model/User';
import { UserProviderConfig, UserProvider } from './users-provider';

export function signInOrUpUser(email: string, config: UserProviderConfig): Promise<User> {
  const userProvider = new UserProvider(config);
  return userProvider.getUserByEmail(email).catch(() => {
    const newUser = { UserId: email } as User;
    return userProvider.putUser(newUser).then(() => newUser);
  });
}
