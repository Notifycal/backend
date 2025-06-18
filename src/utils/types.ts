export type CapitalizeFirst<T extends string> = T extends `${infer First}${infer Rest}`
  ? `${Uppercase<First>}${Rest}`
  : T;

type SplitByDot<T extends string> = T extends `${infer First}.${infer Rest}`
  ? [First, ...SplitByDot<Rest>]
  : [T];

type JoinPascalCase<T extends ReadonlyArray<string>> = T extends readonly [
  infer First,
  ...infer Rest
]
  ? First extends string
    ? Rest extends ReadonlyArray<string>
      ? Rest['length'] extends 0
        ? CapitalizeFirst<First>
        : `${CapitalizeFirst<First>}${JoinPascalCase<Rest>}`
      : never
    : never
  : '';

type InsertEventBeforeLast<T extends ReadonlyArray<string>> = T extends readonly [
  ...infer Init,
  infer Last
]
  ? Init extends ReadonlyArray<string>
    ? Last extends string
      ? [...Init, 'Event', Last]
      : never
    : never
  : T extends readonly [infer Single]
    ? Single extends string
      ? [Single]
      : never
    : [];

export type PascalCaseEventType<T extends string> = T extends string
  ? SplitByDot<T> extends infer Parts
    ? Parts extends ReadonlyArray<string>
      ? Parts['length'] extends 1
        ? T
        : JoinPascalCase<InsertEventBeforeLast<Parts>>
      : never
    : never
  : never;
