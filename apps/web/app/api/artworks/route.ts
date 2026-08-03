import { NextResponse } from "next/server";
import { getArtworkRepository } from "../../../server/runtime";
import { requireSessionUserId } from "../../../server/session";

const TYPES = new Set(["STUDY", "SKETCH", "PROJECT", "ARTWORK"]);
const SOURCES = new Set(["PHOTO", "UPLOAD", "CANVAS"]);

export async function GET() {
  try {
    const userId = await requireSessionUserId();
    const artworks = await getArtworkRepository().listOwned(userId);
    return NextResponse.json({ artworks });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ARTWORK_LIST_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = (await request.json()) as Record<string, unknown>;
    const fileAssetId = typeof body.fileAssetId === "string" ? body.fileAssetId : "";
    const title = typeof body.title === "string" ? body.title : "";
    const type = typeof body.type === "string" ? body.type : "";
    const source = typeof body.source === "string" ? body.source : "";
    const notes = typeof body.notes === "string" ? body.notes : null;
    if (!fileAssetId || !title.trim() || !TYPES.has(type) || !SOURCES.has(source)) {
      return NextResponse.json({ code: "INVALID_ARTWORK_INPUT" }, { status: 400 });
    }
    const artwork = await getArtworkRepository().create({
      userId,
      fileAssetId,
      title,
      type: type as "STUDY" | "SKETCH" | "PROJECT" | "ARTWORK",
      source: source as "PHOTO" | "UPLOAD" | "CANVAS",
      notes,
    });
    return NextResponse.json({ artwork }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ARTWORK_CREATE_FAILED";
    const status = code === "UNAUTHENTICATED" ? 401 : code === "CREATE_FILE_NOT_READY" ? 409 : 500;
    return NextResponse.json({ code }, { status });
  }
}
