export const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

export const attempt = async <T>(
  promise: Promise<T>
): Promise<[T, null] | [null, Error]> => {
  try {
    return [await promise, null];
  } catch (error) {
    return [null, toError(error)];
  }
};

export const attemptSync = <T>(fn: () => T): [T, null] | [null, Error] => {
  try {
    return [fn(), null];
  } catch (error) {
    return [null, toError(error)];
  }
};

export const withFallback = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
  const [data, error] = await attempt(promise);
  return error ? fallback : data;
};

export const reportBackgroundError = (scope: string, error: unknown): void => {
  console.warn(`background task failed: ${scope}`, error);
};
