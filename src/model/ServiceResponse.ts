export interface ServiceResponse<T, TError extends Error> {
  successList: Array<T>;
  failureList: Array<TError>;
}
