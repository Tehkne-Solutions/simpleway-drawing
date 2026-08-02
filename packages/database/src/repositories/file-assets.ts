import type { FileAssetRepository, PendingFileAssetInput, UserId } from "@swd/domain";
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

  async markReady(fileAssetId: string, ownerUserId: UserId): Promise<void> {
    const updated = await this.db
      .update(fileAssets)
      .set({ status: "READY" })
      .where(and(eq(fileAssets.id, fileAssetId), eq(fileAssets.ownerUserId, ownerUserId)))
      .returning({ id: fileAssets.id });

    if (updated.length === 0) {
      throw new Error("FILE_ASSET_NOT_FOUND");
    }
  }
}
