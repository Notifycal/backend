export function toPascalCase(value: string): string {
  return value
    .replaceAll('_', '.')
    .split('.')
    .reduce((acc, part) => {
      return acc + part.charAt(0).toUpperCase() + part.slice(1);
    }, '');
}
