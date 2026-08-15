import { artworkVersions, artworks, fileAssets } from "@swd/database";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { logServerError } from "../../../../../../../server/logger";
import { getDatabase, getStorage } from "../../../../../../../server/runtime";
import { getSessionUserId } from "../../../../../../../server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ artworkId: string; versionNumber: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401, headers: { "cache-control": "no-store" } });

    const { artworkId, versionNumber } = await context.params;
    const parsedVersion = Number(versionNumber);
    if (!Number.isInteger(parsedVersion) || parsedVersion < 1) {
      return NextResponse.json({ code: "ARTWORK_VERSION_NOT_FOUND" }, { status: 404, headers: { "cache-control": "no-store" } });
    }

    const db = getDatabase();
    const [row] = await db
      .select({ storageKey: fileAssets.storageKey, mimeType: fileAssets.mimeType })
      .from(artworkVersions)
      .innerJoin(artworks, eq(artworks.id, artworkVersions.artworkId))
      .innerJoin(fileAssets, eq(fileAssets.id, artworkVersions.fileAssetId))
      .where(and(
        eq(artworkVersions.artworkId, artworkId),
        eq(artworkVersions.versionNumber, parsedVersion),
        eq(artworks.ownerUserId, userId),
      ))
      .limit(1);

    if (!row) return NextResponse.json({ code: "ARTWORK_VERSION_NOT_FOUND" }, { status: 404, headers: { "cache-control": "no-store" } });

    const file = await getStorage().readPrivateFile(row.storageKey);
    const body = new ArrayBuffer(file.body.byteLength);
    new Uint8Array(body).set(file.body);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": row.mimeType,
        "content-length": String(file.byteSize),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    logServerError("artworks.version_image_failed", request, error);
    return NextResponse.json({ code: "ARTWORK_VERSION_IMAGE_FAILED" }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
