export type ReplaceUnderscoreWithDot<T extends string> = T extends `${infer First}_${infer Rest}`
  ? `${First}.${ReplaceUnderscoreWithDot<Rest>}`
  : T;

export type SplitByDot<T extends string> = T extends `${infer First}.${infer Rest}`
  ? [First, ...SplitByDot<Rest>]
  : [T];

export type CapitalizeFirst<T extends string> = T extends `${infer First}${infer Rest}`
  ? `${Uppercase<First>}${Rest}`
  : T;
