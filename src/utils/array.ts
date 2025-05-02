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

export function capArray<T>(
  input: Array<T>,
  limit: number
): { items: Array<T>; dropped: Array<T> } {
  if (input.length <= limit) {
    return { items: input, dropped: [] };
  }
  if (limit < 0) {
    return { items: [], dropped: input };
  }
  const sanitizedList = input.slice(0, limit);
  const droppedItems = input.slice(limit);

  return { items: sanitizedList, dropped: droppedItems };
}
