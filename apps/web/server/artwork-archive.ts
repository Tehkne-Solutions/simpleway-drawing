import { artworkVersions, artworks, fileAssets } from "@swd/database";
import { and, desc, eq } from "drizzle-orm";
import { getDatabase, getStorage } from "./runtime";

export type ArtworkLibraryItem = {
  id: string;
  type: string;
  title: string | null;
  visibility: string;
  updatedAt: Date;
  versionNumber: number;
  source: string;
  imageUrl: string;
};

export async function getArtworkLibrary(userId: string): Promise<ArtworkLibraryItem[]> {
  const rows = await getDatabase()
    .select({
      id: artworks.id,
      type: artworks.type,
      title: artworks.title,
      visibility: artworks.visibility,
      updatedAt: artworks.updatedAt,
      versionNumber: artworkVersions.versionNumber,
      source: artworkVersions.source,
    })
    .from(artworks)
    .innerJoin(artworkVersions, eq(artworkVersions.id, artworks.currentVersionId))
    .where(eq(artworks.ownerUserId, userId))
    .orderBy(desc(artworks.updatedAt));

  return rows.map((row) => ({
    ...row,
    imageUrl: `/api/artworks/${encodeURIComponent(row.id)}/current-image`,
  }));
}

export async function getJourneyArtworkPreview(userId: string, artworkId: string, versionNumber: number | null) {
  const filters = [eq(artworks.ownerUserId, userId), eq(artworks.id, artworkId)];
  if (versionNumber != null) filters.push(eq(artworkVersions.versionNumber, versionNumber));

  const [row] = await getDatabase()
    .select({
      versionNumber: artworkVersions.versionNumber,
      source: artworkVersions.source,
      mimeType: fileAssets.mimeType,
      storageKey: fileAssets.storageKey,
    })
    .from(artworks)
    .innerJoin(artworkVersions, eq(artworkVersions.artworkId, artworks.id))
    .innerJoin(fileAssets, eq(fileAssets.id, artworkVersions.fileAssetId))
    .where(and(...filters))
    .orderBy(desc(artworkVersions.versionNumber))
    .limit(1);

  if (!row || !row.mimeType.startsWith("image/")) return null;
  return {
    versionNumber: row.versionNumber,
    source: row.source,
    imageUrl: await getStorage().createPrivateReadUrl(row.storageKey),
  };
}
