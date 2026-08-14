import { normalizeArtworkReviewPlan, type ArtworkReviewPlan } from "@swd/domain";

export type ReviewCyclePlan = {
  preserve: string;
  transform: string;
};

export type ResolvedReviewCycle = {
  plan: ReviewCyclePlan;
  baseVersionNumber: number;
  provenance: "STRUCTURED" | "LEGACY";
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

export function resolveReviewCycle(input: {
  versionNumber: number;
  source: string;
  notes: string | null;
  reviewPlan: ArtworkReviewPlan | null | unknown;
}): ResolvedReviewCycle | null {
  if (input.source !== "CANVAS" || input.versionNumber < 2) return null;
  const structured = normalizeArtworkReviewPlan(input.reviewPlan);
  if (structured && structured.baseVersionNumber === input.versionNumber - 1) {
    return {
      plan: { preserve: structured.preserve, transform: structured.transform },
      baseVersionNumber: structured.baseVersionNumber,
      provenance: "STRUCTURED",
    };
  }
  const legacy = parseReviewCyclePlan(input.notes);
  return legacy
    ? { plan: legacy, baseVersionNumber: input.versionNumber - 1, provenance: "LEGACY" }
    : null;
}
