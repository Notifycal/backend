import { createRequire } from 'node:module';
import buffer from 'node:buffer';

globalThis.require = createRequire(import.meta.url);
