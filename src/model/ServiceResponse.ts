export interface ServiceResponse<T> {
  successList: Array<T>;
  failureList: Array<Error>;
}
