import { NextResponse } from "next/server";
import { getArtworkRepository } from "../../../../../server/runtime";
import { requireSessionUserId } from "../../../../../server/session";

const SOURCES = new Set(["PHOTO", "UPLOAD", "CANVAS"]);

export async function POST(request: Request, context: { params: Promise<{ artworkId: string }> }) {
  try {
    const userId = await requireSessionUserId();
    const { artworkId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const fileAssetId = typeof body.fileAssetId === "string" ? body.fileAssetId : "";
    const source = typeof body.source === "string" ? body.source : "";
    const notes = typeof body.notes === "string" ? body.notes : null;
    if (!fileAssetId || !SOURCES.has(source)) return NextResponse.json({ code: "INVALID_ARTWORK_VERSION_INPUT" }, { status: 400 });
    const version = await getArtworkRepository().addVersion({ userId, artworkId, fileAssetId, source: source as "PHOTO" | "UPLOAD" | "CANVAS", notes });
    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ARTWORK_VERSION_FAILED";
    const status = code === "UNAUTHENTICATED" ? 401 : code === "ARTWORK_NOT_FOUND" ? 404 : code === "CREATE_FILE_NOT_READY" ? 409 : 500;
    return NextResponse.json({ code }, { status });
  }
}
