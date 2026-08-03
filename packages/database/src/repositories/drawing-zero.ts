import type {
  CreateDrawingZeroInput,
  CreateDrawingZeroResult,
  DrawingZeroRepository,
} from "@swd/domain";
import { and, eq } from "drizzle-orm";
import type { Database } from "../client";
import {
  artworks,
  artworkVersions,
  exerciseAttempts,
  fileAssets,
  outboxEvents,
} from "../schema/core";
import { journeyEntries } from "../schema/journey";

export class DrizzleDrawingZeroRepository implements DrawingZeroRepository {
  constructor(private readonly db: Database) {}

  async createBaseline(input: CreateDrawingZeroInput): Promise<CreateDrawingZeroResult> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: exerciseAttempts.id, artworkId: exerciseAttempts.artworkId })
        .from(exerciseAttempts)
        .where(
          and(
            eq(exerciseAttempts.userId, input.userId),
            eq(exerciseAttempts.exerciseKey, "exercise.swd.c0.drawing_zero"),
            eq(exerciseAttempts.status, "SUBMITTED"),
          ),
        )
        .limit(1);

      if (existing?.artworkId) {
        return {
          artworkId: existing.artworkId,
          attemptId: existing.id,
          exerciseKey: "exercise.swd.c0.drawing_zero",
          exerciseVersion: 1,
          baselineOnly: true,
          visibility: "PRIVATE",
        };
      }

      const [file] = await tx
        .select({ id: fileAssets.id })
        .from(fileAssets)
        .where(
          and(
            eq(fileAssets.id, input.fileAssetId),
            eq(fileAssets.ownerUserId, input.userId),
            eq(fileAssets.status, "READY"),
          ),
        )
        .limit(1);

      if (!file) throw new Error("DRAWING_ZERO_FILE_NOT_READY");

      const [artwork] = await tx
        .insert(artworks)
        .values({
          ownerUserId: input.userId,
          type: "BASELINE",
          status: "ACTIVE",
          visibility: "PRIVATE",
          title: "Drawing Zero",
        })
        .returning({ id: artworks.id });

      if (!artwork) throw new Error("DRAWING_ZERO_ARTWORK_CREATE_FAILED");

      const [version] = await tx
        .insert(artworkVersions)
        .values({ artworkId: artwork.id, versionNumber: 1, fileAssetId: input.fileAssetId, source: input.source })
        .returning({ id: artworkVersions.id });

      if (!version) throw new Error("DRAWING_ZERO_VERSION_CREATE_FAILED");

      await tx.update(artworks).set({ currentVersionId: version.id, updatedAt: new Date() }).where(eq(artworks.id, artwork.id));

      const [attempt] = await tx
        .insert(exerciseAttempts)
        .values({
          userId: input.userId,
          exerciseKey: "exercise.swd.c0.drawing_zero",
          exerciseVersion: 1,
          status: "SUBMITTED",
          assistanceLevel: 0,
          difficultySnapshot: { complexity: 1, precision: 1, memory: 0, speed: 0, spatial: 1, creative: 0 },
          artworkId: artwork.id,
          submittedAt: new Date(),
        })
        .returning({ id: exerciseAttempts.id });

      if (!attempt) throw new Error("DRAWING_ZERO_ATTEMPT_CREATE_FAILED");

      await tx.insert(journeyEntries).values({
        userId: input.userId,
        artworkId: artwork.id,
        type: "DRAWING_ZERO",
        title: "Minha jornada começou",
        metadata: { exerciseKey: "exercise.swd.c0.drawing_zero", baselineOnly: true, visibility: "PRIVATE" },
      });

      await tx.insert(outboxEvents).values({
        eventType: "drawing.drawing_zero.submitted.v1",
        aggregateType: "exercise_attempt",
        aggregateId: attempt.id,
        payload: {
          userId: input.userId,
          artworkId: artwork.id,
          artworkVersionId: version.id,
          exerciseKey: "exercise.swd.c0.drawing_zero",
          baselineOnly: true,
        },
      });

      return {
        artworkId: artwork.id,
        attemptId: attempt.id,
        exerciseKey: "exercise.swd.c0.drawing_zero",
        exerciseVersion: 1,
        baselineOnly: true,
        visibility: "PRIVATE",
      };
    });
  }
}
