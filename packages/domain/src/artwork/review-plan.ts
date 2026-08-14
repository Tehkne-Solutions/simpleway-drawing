export const REVIEW_PLAN_DECISION_MAX_LENGTH = 280;

export type ArtworkReviewPlan = {
  preserve: string;
  transform: string;
  baseVersionNumber: number;
};

export function normalizeArtworkReviewPlan(value: unknown): ArtworkReviewPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const preserve = typeof raw.preserve === "string" ? raw.preserve.trim() : "";
  const transform = typeof raw.transform === "string" ? raw.transform.trim() : "";
  const baseVersionNumber = raw.baseVersionNumber;
  if (!preserve || !transform || preserve.length > REVIEW_PLAN_DECISION_MAX_LENGTH || transform.length > REVIEW_PLAN_DECISION_MAX_LENGTH) return null;
  if (typeof baseVersionNumber !== "number" || !Number.isInteger(baseVersionNumber) || baseVersionNumber < 1) return null;
  return { preserve, transform, baseVersionNumber };
}
