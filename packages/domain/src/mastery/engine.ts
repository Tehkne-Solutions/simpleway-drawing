export type MasteryLevel = "INTRODUCED" | "PRACTICING" | "DEVELOPING" | "COMPETENT" | "STRONG" | "MASTERED";

export interface MasteryEvidenceInput {
  value: number;
  confidence: number;
  assistanceLevel: number;
}

export interface MasteryStateInput {
  masteryScore: number;
  confidence: number;
  evidenceCount: number;
}

export interface MasteryUpdate {
  masteryScore: number;
  confidence: number;
  evidenceCount: number;
  masteryLevel: MasteryLevel;
  nextReviewDays: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function masteryLevelFor(score: number, evidenceCount: number): MasteryLevel {
  if (evidenceCount < 2) return "INTRODUCED";
  if (score < 0.4) return "PRACTICING";
  if (score < 0.58) return "DEVELOPING";
  if (score < 0.74) return "COMPETENT";
  if (score < 0.88) return "STRONG";
  return "MASTERED";
}

export function updateMastery(previous: MasteryStateInput | null, evidence: MasteryEvidenceInput): MasteryUpdate {
  const value = clamp01(evidence.value);
  const confidence = clamp01(evidence.confidence);
  const independence = clamp01(1 - evidence.assistanceLevel / 5);
  const effective = value * (0.72 + 0.28 * independence);

  const previousScore = previous?.masteryScore ?? 0.3;
  const previousConfidence = previous?.confidence ?? 0.25;
  const previousCount = previous?.evidenceCount ?? 0;

  const evidenceWeight = 0.24 + 0.26 * confidence;
  const masteryScore = clamp01(previousScore * (1 - evidenceWeight) + effective * evidenceWeight);
  const nextConfidence = clamp01(previousConfidence + (1 - previousConfidence) * (0.18 + 0.22 * confidence));
  const evidenceCount = previousCount + 1;
  const masteryLevel = masteryLevelFor(masteryScore, evidenceCount);

  const nextReviewDays = masteryScore >= 0.88 ? 14 : masteryScore >= 0.74 ? 7 : masteryScore >= 0.58 ? 4 : masteryScore >= 0.4 ? 2 : 1;

  return {
    masteryScore: Number(masteryScore.toFixed(4)),
    confidence: Number(nextConfidence.toFixed(4)),
    evidenceCount,
    masteryLevel,
    nextReviewDays,
  };
}
