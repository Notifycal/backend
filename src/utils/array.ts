export function partitionByError<T, TError extends Error>(
  list: Array<T | TError>
): [Array<T>, Array<TError>] {
  return list.reduce<[Array<T>, Array<TError>]>(
    (acc, item) => {
      if (item instanceof Error) {
        acc[1].push(item);
      } else {
        acc[0].push(item);
      }
      return acc;
    },
    [[], []]
  );
}
