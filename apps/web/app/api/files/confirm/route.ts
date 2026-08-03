import { NextResponse } from "next/server";
import { getFileServices } from "../../../../server/runtime";
import { requireSessionUserId } from "../../../../server/session";

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = (await request.json()) as { fileAssetId?: string };
    if (!body.fileAssetId) return NextResponse.json({ code: "FILE_ASSET_ID_REQUIRED" }, { status: 400 });
    await getFileServices().confirm.execute(body.fileAssetId, userId);
    return NextResponse.json({ ready: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UPLOAD_CONFIRM_FAILED";
    const status = code === "UNAUTHENTICATED" ? 401 : code.startsWith("FILE_") || code.startsWith("UPLOADED_") ? 400 : 500;
    return NextResponse.json({ code }, { status });
  }
}
