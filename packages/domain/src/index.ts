export type UserId = string;
export type ArtworkId = string;
export type ArtworkVersionId = string;
export type AttemptId = string;
export type EvidenceId = string;
export type SkillKey = `skill.${string}`;
export type ExerciseKey = `exercise.${string}`;

export type ArtworkType =
  | "BASELINE"
  | "STUDY"
  | "SKETCH"
  | "EXERCISE_RESULT"
  | "PROJECT"
  | "ARTWORK";

export type ArtworkVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";
export type ArtworkStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface Artwork {
  id: ArtworkId;
  ownerUserId: UserId;
  type: ArtworkType;
  title: string | null;
  status: ArtworkStatus;
  visibility: ArtworkVisibility;
  currentVersionId: ArtworkVersionId | null;
  createdAt: Date;
}

export type ArtworkVersionSource =
  | "CANVAS"
  | "PHOTO"
  | "UPLOAD"
  | "GENERATED_PREVIEW";

export interface ArtworkVersion {
  id: ArtworkVersionId;
  artworkId: ArtworkId;
  versionNumber: number;
  fileAssetId: string;
  source: ArtworkVersionSource;
  notes: string | null;
  createdAt: Date;
}

export enum AssistanceLevel {
  Independent = 0,
  TemporaryReference = 1,
  Reference = 2,
  PartialGuide = 3,
  FullGuide = 4,
  Demonstration = 5,
}

export type EvidenceType =
  | "SELF_REPORTED"
  | "PERCEPTUAL_CHOICE"
  | "MOTOR_EXECUTION"
  | "STRUCTURAL_EXECUTION"
  | "OBSERVATIONAL_DRAWING"
  | "CREATIVE_APPLICATION"
  | "SELF_DIAGNOSIS"
  | "CORRECTION_DELTA"
  | "TRANSFER"
  | "PROJECT"
  | "SYSTEM_MEASURED"
  | "AI_ASSESSED";

export interface Evidence {
  id: EvidenceId;
  userId: UserId;
  skillKey: SkillKey;
  type: EvidenceType;
  dimension: string | null;
  value: number;
  confidence: number;
  assistanceLevel: AssistanceLevel;
  difficulty: Readonly<Record<string, number>>;
  context: string | null;
  sourceType: string;
  sourceId: string;
  evaluatorType: string;
  evaluatorVersion: string | null;
  createdAt: Date;
}

export type MasteryLevel =
  | "INTRODUCED"
  | "PRACTICING"
  | "DEVELOPING"
  | "COMPETENT"
  | "STRONG"
  | "MASTERED";

export interface LearnerSkillState {
  userId: UserId;
  skillKey: SkillKey;
  masteryScore: number;
  masteryLevel: MasteryLevel;
  confidence: number;
  depth: number;
  breadth: number;
  evidenceCount: number;
  lastPracticedAt: Date | null;
  nextReviewAt: Date | null;
  masteryAlgorithmVersion: string;
}

export * from "./artwork/drawing-zero";
export * from "./artwork/file-storage";
export * from "./artwork/create-policy";
export * from "./artwork/review-plan";
export * from "./mastery/engine";
