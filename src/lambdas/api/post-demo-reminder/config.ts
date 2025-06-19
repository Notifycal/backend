import type {
  AuthedEndpointConfig,
  DemoReminderToBeSentTopicConfig as DemoReminderTopicConfig
} from '@model/Config';
import {
  readAuthedEndpointConfig,
  readDemoReminderToBeSentTopicConfig,
  readEnv,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';
import type { APIGatewayProxyEvent } from 'aws-lambda';

export type PostDemoReminderConfig = AuthedEndpointConfig &
  DemoReminderTopicConfig &
  UserBaseStoreEndpointConfig;

export function readPostDemoReminderConfig(
  event: APIGatewayProxyEvent
): Promise<PostDemoReminderConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuthedEndpointConfig(env, event.headers),
    ...readDemoReminderToBeSentTopicConfig(env),
    ...readUserBaseStoreConfig(env)
  }));
}
