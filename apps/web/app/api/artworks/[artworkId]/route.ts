import { NextResponse } from "next/server";
import { getArtworkRepository } from "../../../../server/runtime";
import { requireSessionUserId } from "../../../../server/session";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ artworkId: string }> }) {
  try {
    const userId = await requireSessionUserId();
    const { artworkId } = await context.params;
    const record = await getArtworkRepository().getOwned(userId, artworkId);
    if (!record) return NextResponse.json({ code: "ARTWORK_NOT_FOUND" }, { status: 404, headers: { "cache-control": "no-store" } });

    const versions = record.versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      fileAssetId: version.fileAssetId,
      mimeType: version.mimeType,
      source: version.source,
      notes: version.notes,
      reviewPlan: version.reviewPlan,
      createdAt: version.createdAt,
      readUrl: `/api/artworks/${encodeURIComponent(record.artwork.id)}/versions/${version.versionNumber}/image`,
    }));

    return NextResponse.json({ artwork: record.artwork, versions }, { headers: { "cache-control": "no-store, private" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ARTWORK_DETAIL_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500, headers: { "cache-control": "no-store" } });
  }
}
