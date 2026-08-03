import { NextResponse } from "next/server";
import { logServerError } from "../../../../server/logger";
import { getFileServices } from "../../../../server/runtime";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../../server/request-security";
import { requireSessionUserId } from "../../../../server/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireSessionUserId();
    const body = await readJsonBody<{ fileAssetId?: string }>(request, 4_096);
    if (!body.fileAssetId) return NextResponse.json({ code: "FILE_ASSET_ID_REQUIRED" }, { status: 400 });
    await getFileServices().confirm.execute(body.fileAssetId, userId);
    return NextResponse.json({ ready: true });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "UPLOAD_CONFIRM_FAILED";
    logServerError("files.private_upload.confirm_failed", request, error);
    const status = code === "UNAUTHENTICATED" ? 401 : code.startsWith("FILE_") || code.startsWith("UPLOADED_") ? 400 : 500;
    return NextResponse.json({ code }, { status });
  }
}
