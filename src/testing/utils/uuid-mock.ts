import { v4 } from 'uuid';

export function softwareUnderTest(): string {
  return v4() + ' hello';
}
