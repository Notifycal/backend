import type { Jwt } from '@own-types/model';

export interface AuthenticationResponse {
  accessToken: Jwt;
  tokenType: 'Bearer';
  refreshToken: Jwt;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BodyContent = Record<string, any> | Array<unknown>;
export interface SuccessResponseContainer<T extends BodyContent = BodyContent> {
  result: T;
}
export type SuccessResponseBody = SuccessResponseContainer<BodyContent> | AuthenticationResponse;

export interface ErrorResponseBody {
  message: string;
}

export type ResponseBody = SuccessResponseBody | ErrorResponseBody;

export interface ResponseHeaders {
  [header: string]: boolean | number | string;
}
