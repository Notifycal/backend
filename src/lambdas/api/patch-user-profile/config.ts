import type { AuthedEndpointConfig } from '@model/Config';
import {
  readAuthedEndpointConfig,
  readEnv,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';
import type { APIGatewayProxyEvent } from 'aws-lambda';

export type PatchUserProfileConfig = AuthedEndpointConfig & UserBaseStoreEndpointConfig;

export function readPatchUserConfig(event: APIGatewayProxyEvent): Promise<PatchUserProfileConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuthedEndpointConfig(env, event.headers),
    ...readUserBaseStoreConfig(env)
  }));
}
