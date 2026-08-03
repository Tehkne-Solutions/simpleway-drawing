import { NextResponse } from "next/server";
import { logServerError } from "../../../server/logger";
import { getDrawingZeroRepository } from "../../../server/runtime";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../server/request-security";
import { requireSessionUserId } from "../../../server/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireSessionUserId();
    const body = await readJsonBody<{ fileAssetId?: string; source?: "PHOTO" | "UPLOAD" | "CANVAS" }>(request, 4_096);
    if (!body.fileAssetId) return NextResponse.json({ code: "FILE_ASSET_ID_REQUIRED" }, { status: 400 });
    if (body.source !== "PHOTO" && body.source !== "UPLOAD" && body.source !== "CANVAS") {
      return NextResponse.json({ code: "INVALID_ARTWORK_SOURCE" }, { status: 400 });
    }

    const result = await getDrawingZeroRepository().createBaseline({
      userId,
      fileAssetId: body.fileAssetId,
      source: body.source,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "DRAWING_ZERO_SUBMIT_FAILED";
    logServerError("drawing_zero.submit_failed", request, error);
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : code.startsWith("DRAWING_ZERO_") ? 400 : 500 });
  }
}
