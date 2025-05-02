export function toBase64(object: object): string {
  const jsonString = JSON.stringify(object);
  return btoa(jsonString);
}
