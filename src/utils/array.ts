export function partitionByError<T>(list: Array<T | Error>): [Array<T>, Array<Error>] {
  return list.reduce<[Array<T>, Array<Error>]>(
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
