import { createRequire } from 'node:module';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import buffer from 'node:buffer';

globalThis.require = createRequire(import.meta.url);
