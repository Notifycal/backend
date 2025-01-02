export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'An unknown error occurred.';
  }
}

export function rejectWithErrorMessage(baseMsg: string, error: unknown): Promise<never> {
  const message = extractErrorMessage(error);
  return Promise.reject(new Error(`${baseMsg}. Error: ${message}`));
}
