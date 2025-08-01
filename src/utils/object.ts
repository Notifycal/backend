type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? K | `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type DeepOmit<T, K extends string> = T extends object
  ? K extends `${infer FirstKey}.${infer RestKey}`
    ? FirstKey extends keyof T
      ? Omit<T, FirstKey> & {
          [P in FirstKey]: DeepOmit<T[P], RestKey>;
        }
      : T
    : Omit<T, K & keyof T>
  : T;

type DeepOmitMultiple<T, K extends ReadonlyArray<string>> = K extends readonly [
  infer First,
  ...infer Rest
]
  ? First extends string
    ? Rest extends ReadonlyArray<string>
      ? DeepOmitMultiple<DeepOmit<T, First>, Rest>
      : DeepOmit<T, First>
    : T
  : T;

export function omitDeep<T extends object, K extends ReadonlyArray<NestedKeyOf<T>>>(
  obj: T,
  ...paths: K
): DeepOmitMultiple<T, K> {
  const result = structuredClone(obj);

  paths
    .map((path) => path.split('.'))
    .forEach((keys) => {
      keys.reduce(
        (acc: Record<string, unknown> | undefined, key, index) => {
          if (!acc || typeof acc !== 'object') return undefined;
          if (index === keys.length - 1) {
            delete acc[key];
          }
          return acc[key] as Record<string, unknown> | undefined;
        },
        result as Record<string, unknown>
      );
    });

  return result as DeepOmitMultiple<T, K>;
}
