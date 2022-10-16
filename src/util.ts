const interns: Record<string, string> = Object.create(null);
export function intern(str: string): string {
  if (interns[str]) return interns[str];
  interns[str] = str;
  return str;
}
