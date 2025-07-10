import type { GaxiosResponse } from '@services/google/gaxios';

export type MinimalGaxiosResponse<T> = Pick<GaxiosResponse<T>, 'status' | 'data'>;
