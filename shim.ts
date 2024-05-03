import { createRequire } from 'node:module';
/* eslint-disable */
import buffer from 'node:buffer';
/* eslint-enable */

globalThis.require = createRequire(import.meta.url);
