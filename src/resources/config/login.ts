import { LoginConfig } from '../../lambdas/api/login/config.js';
import * as env from 'env-var';

export var loginConfig: LoginConfig = {
  privateKey: env.get('JWT_PRIVATE_KEY').required().asString(),
  jwt: {
    algorithm: env.get('JWT_ALGORITHM').required().default('RS256').asString(),
    issuer: env.get('JWT_ISSUER').required().default('notifycal.com').asString(),
    expiresIn: env.get('JWT_EXPIRATATION').required().default('5m').asString()
  },
  googleClientId: env.get('GOOGLE_CLIENT_ID').required().asString()
};
