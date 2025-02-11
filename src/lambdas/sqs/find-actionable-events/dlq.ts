import { logger } from '@common/powertools';
import { extractErrorMessage } from '@services/common/error-handling';

//TODO
export function publishToDlq(error: Error): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  return Promise.resolve(logger.warn(extractErrorMessage(error)));
}
