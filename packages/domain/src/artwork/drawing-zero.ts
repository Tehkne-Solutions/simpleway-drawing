import type { ArtworkId, AttemptId, UserId } from "../index";

export const DRAWING_ZERO_EXERCISE_KEY = "exercise.swd.c0.drawing_zero" as const;
export const DRAWING_ZERO_EXERCISE_VERSION = 1;

export interface CreateDrawingZeroInput {
  userId: UserId;
  fileAssetId: string;
  source: "PHOTO" | "UPLOAD" | "CANVAS";
}

export interface CreateDrawingZeroResult {
  artworkId: ArtworkId;
  attemptId: AttemptId;
  exerciseKey: typeof DRAWING_ZERO_EXERCISE_KEY;
  exerciseVersion: number;
  baselineOnly: true;
  visibility: "PRIVATE";
}

export interface DrawingZeroRepository {
  createBaseline(input: CreateDrawingZeroInput): Promise<CreateDrawingZeroResult>;
}
