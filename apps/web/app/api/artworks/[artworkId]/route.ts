import { NextResponse } from "next/server";
import { getArtworkRepository, getStorage } from "../../../../server/runtime";
import { requireSessionUserId } from "../../../../server/session";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ artworkId: string }> }) {
  try {
    const userId = await requireSessionUserId();
    const { artworkId } = await context.params;
    const record = await getArtworkRepository().getOwned(userId, artworkId);
    if (!record) return NextResponse.json({ code: "ARTWORK_NOT_FOUND" }, { status: 404, headers: { "cache-control": "no-store" } });

    const versions = await Promise.all(record.versions.map(async (version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      fileAssetId: version.fileAssetId,
      mimeType: version.mimeType,
      source: version.source,
      notes: version.notes,
      reviewPlan: version.reviewPlan,
      createdAt: version.createdAt,
      readUrl: await getStorage().createPrivateReadUrl(version.storageKey, 300),
    })));

    return NextResponse.json({ artwork: record.artwork, versions }, { headers: { "cache-control": "no-store, private" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ARTWORK_DETAIL_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500, headers: { "cache-control": "no-store" } });
  }
}
