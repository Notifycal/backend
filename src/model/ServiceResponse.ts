export interface ServiceResponse<T, TError extends Error> {
  successList: Array<T> | undefined;
  failureList: Array<TError>;
}
