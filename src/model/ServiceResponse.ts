export interface ServiceResponse<T> {
  successList: Array<T> | undefined;
  failureList: Array<Error>;
}
