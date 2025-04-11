let isColdStart = true;

export function checkColdStart(): boolean {
  if (isColdStart) {
    isColdStart = false;
    return true;
  }

  return false;
}
