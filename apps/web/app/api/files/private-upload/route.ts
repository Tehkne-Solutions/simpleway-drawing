import type { SupportedArtworkMimeType } from "@swd/domain";
import { NextResponse } from "next/server";
import { getFileServices } from "../../../../server/runtime";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../../server/request-security";
import { requireSessionUserId } from "../../../../server/session";

const allowed = new Set<SupportedArtworkMimeType>(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireSessionUserId();
    const body = await readJsonBody<{ mimeType?: string; byteSize?: number }>(request, 4_096);
    if (!body.mimeType || !allowed.has(body.mimeType as SupportedArtworkMimeType)) {
      return NextResponse.json({ code: "UNSUPPORTED_FILE_TYPE" }, { status: 400 });
    }
    if (!Number.isInteger(body.byteSize) || !body.byteSize || body.byteSize <= 0 || body.byteSize > MAX_BYTES) {
      return NextResponse.json({ code: "INVALID_FILE_SIZE" }, { status: 400 });
    }

    const { prepare } = getFileServices();
    const intent = await prepare.execute({
      ownerUserId: userId,
      mimeType: body.mimeType as SupportedArtworkMimeType,
      byteSize: body.byteSize,
      purpose: "ARTWORK_PRIVATE_UPLOAD",
    });
    return NextResponse.json(intent, { status: 201 });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "UPLOAD_PREPARE_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
