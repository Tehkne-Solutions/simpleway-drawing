export type ReviewCyclePlan = {
  preserve: string;
  transform: string;
};

const MAX_DECISION_LENGTH = 280;

export function parseReviewCyclePlan(notes: string | null): ReviewCyclePlan | null {
  if (!notes) return null;
  const normalized = notes.trim();
  const match = /^Preservar:\s*([^\r\n]{1,280})\r?\nTransformar:\s*([^\r\n]{1,280})$/.exec(normalized);
  if (!match) return null;
  const preserve = (match[1] ?? "").trim();
  const transform = (match[2] ?? "").trim();
  if (!preserve || !transform || preserve.length > MAX_DECISION_LENGTH || transform.length > MAX_DECISION_LENGTH) return null;
  return { preserve, transform };
}
