import type { SupportedArtworkMimeType } from "@swd/domain";
import { NextResponse } from "next/server";
import { getFileServices } from "../../../../server/runtime";
import { requireSessionUserId } from "../../../../server/session";

const allowed = new Set<SupportedArtworkMimeType>(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = (await request.json()) as { mimeType?: string; byteSize?: number };
    if (!body.mimeType || !allowed.has(body.mimeType as SupportedArtworkMimeType)) {
      return NextResponse.json({ code: "UNSUPPORTED_FILE_TYPE" }, { status: 400 });
    }
    if (!Number.isInteger(body.byteSize) || !body.byteSize || body.byteSize <= 0 || body.byteSize > 15 * 1024 * 1024) {
      return NextResponse.json({ code: "INVALID_FILE_SIZE" }, { status: 400 });
    }

    const { prepare } = getFileServices();
    const intent = await prepare.execute({
      ownerUserId: userId,
      mimeType: body.mimeType as SupportedArtworkMimeType,
      byteSize: body.byteSize,
      purpose: "DRAWING_ZERO",
    });
    return NextResponse.json(intent, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UPLOAD_PREPARE_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
