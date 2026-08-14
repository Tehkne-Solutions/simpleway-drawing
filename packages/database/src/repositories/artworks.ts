import { normalizeArtworkReviewPlan, type ArtworkReviewPlan } from "@swd/domain";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { artworks, artworkVersions, fileAssets, outboxEvents, skillEvidence } from "../schema/core";
import { journeyEntries } from "../schema/journey";

export type CreateArtworkType = "STUDY" | "SKETCH" | "PROJECT" | "ARTWORK";
export type CreateArtworkSource = "PHOTO" | "UPLOAD" | "CANVAS";

export interface CreateArtworkInput {
  userId: string;
  fileAssetId: string;
  type: CreateArtworkType;
  title: string;
  source: CreateArtworkSource;
  notes?: string | null;
}

export interface AddArtworkVersionInput {
  userId: string;
  artworkId: string;
  fileAssetId: string;
  source: CreateArtworkSource;
  notes?: string | null;
  reviewPlan?: ArtworkReviewPlan | null;
}

function reviewPlanFromJourneyMetadata(metadata: unknown, versionNumber: number): ArtworkReviewPlan | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = metadata as Record<string, unknown>;
  if (raw.versionNumber !== versionNumber) return null;
  const reviewPlan = normalizeArtworkReviewPlan(raw.reviewPlan);
  if (!reviewPlan || reviewPlan.baseVersionNumber !== versionNumber - 1) return null;
  return reviewPlan;
}

export class DrizzleArtworkRepository {
  constructor(private readonly db: Database) {}

  private async requireOwnedReadyFile(tx: Parameters<Parameters<Database["transaction"]>[0]>[0], userId: string, fileAssetId: string) {
    const [file] = await tx
      .select({ id: fileAssets.id })
      .from(fileAssets)
      .where(and(eq(fileAssets.id, fileAssetId), eq(fileAssets.ownerUserId, userId), eq(fileAssets.status, "READY")))
      .limit(1);
    if (!file) throw new Error("CREATE_FILE_NOT_READY");
  }

  async create(input: CreateArtworkInput) {
    return this.db.transaction(async (tx) => {
      await this.requireOwnedReadyFile(tx, input.userId, input.fileAssetId);
      const [artwork] = await tx
        .insert(artworks)
        .values({
          ownerUserId: input.userId,
          type: input.type,
          status: "ACTIVE",
          visibility: "PRIVATE",
          title: input.title.trim().slice(0, 200) || "Sem título",
        })
        .returning({ id: artworks.id, type: artworks.type, title: artworks.title, createdAt: artworks.createdAt });
      if (!artwork) throw new Error("ARTWORK_CREATE_FAILED");

      const [version] = await tx
        .insert(artworkVersions)
        .values({ artworkId: artwork.id, versionNumber: 1, fileAssetId: input.fileAssetId, source: input.source, notes: input.notes ?? null })
        .returning({ id: artworkVersions.id });
      if (!version) throw new Error("ARTWORK_VERSION_CREATE_FAILED");

      await tx.update(artworks).set({ currentVersionId: version.id, updatedAt: new Date() }).where(eq(artworks.id, artwork.id));
      await tx.insert(journeyEntries).values({
        userId: input.userId,
        artworkId: artwork.id,
        type: "ARTWORK_CREATED",
        title: input.type === "PROJECT" ? "Novo projeto criado" : "Nova criação registrada",
        metadata: { artworkType: input.type, visibility: "PRIVATE", versionNumber: 1 },
      });

      if (input.type === "PROJECT" || input.type === "ARTWORK") {
        await tx.insert(skillEvidence).values({
          userId: input.userId,
          skillKey: "skill.drawing.meta.creation_practice",
          evidenceType: "CREATIVE_APPLICATION",
          dimension: "creation_practice",
          value: "0.5000",
          confidence: "0.3500",
          assistanceLevel: 0,
          difficulty: { creative: 1 },
          context: input.type,
          sourceType: "artwork",
          sourceId: artwork.id,
          evaluatorType: "SYSTEM_MEASURED",
          evaluatorVersion: "creation-practice-v1",
        });
      }

      await tx.insert(outboxEvents).values({
        eventType: "drawing.artwork.created.v1",
        aggregateType: "artwork",
        aggregateId: artwork.id,
        payload: { userId: input.userId, artworkId: artwork.id, artworkVersionId: version.id, type: input.type, visibility: "PRIVATE" },
      });

      return { ...artwork, currentVersionId: version.id, versionNumber: 1, visibility: "PRIVATE" as const };
    });
  }

  async addVersion(input: AddArtworkVersionInput) {
    return this.db.transaction(async (tx) => {
      await this.requireOwnedReadyFile(tx, input.userId, input.fileAssetId);
      const [owned] = await tx.select({ id: artworks.id }).from(artworks).where(and(eq(artworks.id, input.artworkId), eq(artworks.ownerUserId, input.userId))).limit(1);
      if (!owned) throw new Error("ARTWORK_NOT_FOUND");

      const [latest] = await tx.select({ versionNumber: artworkVersions.versionNumber }).from(artworkVersions).where(eq(artworkVersions.artworkId, input.artworkId)).orderBy(desc(artworkVersions.versionNumber)).limit(1);
      const latestVersionNumber = latest?.versionNumber ?? 0;
      const reviewPlan = input.reviewPlan == null ? null : normalizeArtworkReviewPlan(input.reviewPlan);
      if (input.reviewPlan != null && !reviewPlan) throw new Error("INVALID_REVIEW_PLAN");
      if (reviewPlan && (input.source !== "CANVAS" || reviewPlan.baseVersionNumber !== latestVersionNumber)) throw new Error("INVALID_REVIEW_PLAN");

      const next = latestVersionNumber + 1;
      const [version] = await tx.insert(artworkVersions).values({ artworkId: input.artworkId, versionNumber: next, fileAssetId: input.fileAssetId, source: input.source, notes: input.notes ?? null }).returning({ id: artworkVersions.id, versionNumber: artworkVersions.versionNumber });
      if (!version) throw new Error("ARTWORK_VERSION_CREATE_FAILED");

      await tx.update(artworks).set({ currentVersionId: version.id, updatedAt: new Date() }).where(eq(artworks.id, input.artworkId));
      const journeyMetadata = reviewPlan ? { versionNumber: next, reviewPlan } : { versionNumber: next };
      await tx.insert(journeyEntries).values({ userId: input.userId, artworkId: input.artworkId, type: "ARTWORK_VERSION", title: `Versão ${next} registrada`, metadata: journeyMetadata });
      await tx.insert(outboxEvents).values({ eventType: "drawing.artwork.version_added.v1", aggregateType: "artwork", aggregateId: input.artworkId, payload: { userId: input.userId, artworkId: input.artworkId, artworkVersionId: version.id, versionNumber: next, ...(reviewPlan ? { reviewPlan } : {}) } });
      return { ...version, reviewPlan };
    });
  }

  async listOwned(userId: string) {
    return this.db.select({ id: artworks.id, type: artworks.type, title: artworks.title, visibility: artworks.visibility, currentVersionId: artworks.currentVersionId, createdAt: artworks.createdAt, updatedAt: artworks.updatedAt }).from(artworks).where(eq(artworks.ownerUserId, userId)).orderBy(desc(artworks.updatedAt));
  }

  async getOwned(userId: string, artworkId: string) {
    const [artwork] = await this.db.select().from(artworks).where(and(eq(artworks.id, artworkId), eq(artworks.ownerUserId, userId))).limit(1);
    if (!artwork) return null;
    const [versions, versionEvents] = await Promise.all([
      this.db
        .select({
          id: artworkVersions.id,
          versionNumber: artworkVersions.versionNumber,
          fileAssetId: artworkVersions.fileAssetId,
          storageKey: fileAssets.storageKey,
          mimeType: fileAssets.mimeType,
          source: artworkVersions.source,
          notes: artworkVersions.notes,
          createdAt: artworkVersions.createdAt,
        })
        .from(artworkVersions)
        .innerJoin(fileAssets, eq(fileAssets.id, artworkVersions.fileAssetId))
        .where(eq(artworkVersions.artworkId, artworkId))
        .orderBy(desc(artworkVersions.versionNumber)),
      this.db
        .select({ metadata: journeyEntries.metadata })
        .from(journeyEntries)
        .where(and(eq(journeyEntries.userId, userId), eq(journeyEntries.artworkId, artworkId), eq(journeyEntries.type, "ARTWORK_VERSION"))),
    ]);
    const reviewPlans = new Map<number, ArtworkReviewPlan>();
    for (const event of versionEvents) {
      if (!event.metadata || typeof event.metadata !== "object" || Array.isArray(event.metadata)) continue;
      const versionNumber = (event.metadata as Record<string, unknown>).versionNumber;
      if (typeof versionNumber !== "number" || !Number.isInteger(versionNumber)) continue;
      const reviewPlan = reviewPlanFromJourneyMetadata(event.metadata, versionNumber);
      if (reviewPlan) reviewPlans.set(versionNumber, reviewPlan);
    }
    return { artwork, versions: versions.map((version) => ({ ...version, reviewPlan: reviewPlans.get(version.versionNumber) ?? null })) };
  }
}
