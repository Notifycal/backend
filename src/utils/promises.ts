import { throwError } from '@services/common/error-handling';

export function allSettledAllOrErrorHandler<T>(
  results: Array<PromiseSettledResult<T>>,
  attemptedAction: string
): Array<T> {
  const successList = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (results.every((r) => r.status === 'fulfilled')) {
    return successList;
  }
  const rejectionList = results.filter((r) => r.status === 'rejected');
  throwError(
    `There were ${rejectionList.length} failures to ${attemptedAction}. Successes: ${successList.length}. Total: ${results.length}. All results: ${JSON.stringify(results)}`
  );
}
