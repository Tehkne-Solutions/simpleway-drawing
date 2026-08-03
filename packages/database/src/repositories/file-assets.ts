import type { FileAssetRepository, PendingFileAsset, PendingFileAssetInput, UserId } from "@swd/domain";
import { and, eq } from "drizzle-orm";
import type { Database } from "../client";
import { fileAssets } from "../schema/core";

export class DrizzleFileAssetRepository implements FileAssetRepository {
  constructor(private readonly db: Database) {}

  async createPending(input: PendingFileAssetInput): Promise<void> {
    await this.db.insert(fileAssets).values({
      id: input.id,
      ownerUserId: input.ownerUserId,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      status: "PENDING",
    });
  }

  async getOwnedPending(fileAssetId: string, ownerUserId: UserId): Promise<PendingFileAsset | null> {
    const [row] = await this.db
      .select({
        id: fileAssets.id,
        ownerUserId: fileAssets.ownerUserId,
        storageKey: fileAssets.storageKey,
        mimeType: fileAssets.mimeType,
        byteSize: fileAssets.byteSize,
        status: fileAssets.status,
      })
      .from(fileAssets)
      .where(
        and(
          eq(fileAssets.id, fileAssetId),
          eq(fileAssets.ownerUserId, ownerUserId),
          eq(fileAssets.status, "PENDING"),
        ),
      )
      .limit(1);

    if (!row || row.status !== "PENDING") return null;
    if (row.mimeType !== "image/jpeg" && row.mimeType !== "image/png" && row.mimeType !== "image/webp") {
      return null;
    }

    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      storageKey: row.storageKey,
      mimeType: row.mimeType,
      byteSize: row.byteSize,
      status: "PENDING",
    };
  }

  async markReady(fileAssetId: string, ownerUserId: UserId): Promise<void> {
    const updated = await this.db
      .update(fileAssets)
      .set({ status: "READY" })
      .where(
        and(
          eq(fileAssets.id, fileAssetId),
          eq(fileAssets.ownerUserId, ownerUserId),
          eq(fileAssets.status, "PENDING"),
        ),
      )
      .returning({ id: fileAssets.id });

    if (updated.length === 0) {
      throw new Error("FILE_ASSET_NOT_FOUND");
    }
  }
}
