export function normalizeLearningReturnTo(value: string | undefined): string | null {
  if (!value) return null;
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch {}
  if (!decoded.startsWith("/learn/")) return null;
  if (decoded.startsWith("//") || decoded.includes("\\") || decoded.includes("\n") || decoded.includes("\r")) return null;
  return decoded;
}
