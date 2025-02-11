import type { Record } from '.';

export function process(record: Record): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  return Promise.resolve(console.log(record));
}
