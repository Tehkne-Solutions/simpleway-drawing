import { NextResponse } from "next/server";
import { getActivationRepository, getOperationsRepository } from "../../../../server/runtime";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../../server/request-security";
import { getSessionUserId } from "../../../../server/session";

type HeartbeatInput = {
  path?: string;
  metadata?: Record<string, unknown>;
};

function sanitizePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized.startsWith("/") || normalized.length > 240) return null;
  return normalized;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });

    const input = await readJsonBody<HeartbeatInput>(request, 8_192);
    const activation = await getActivationRepository().getSnapshot(userId);
    const path = sanitizePath(input.path);

    await getOperationsRepository().recordHeartbeat({
      userId,
      stage: activation.stage,
      path,
      metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
    });

    return NextResponse.json({
      stage: activation.stage,
      progress: activation.progress,
      nextAction: activation.nextAction,
    });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    return NextResponse.json({ code: "HEARTBEAT_FAILED" }, { status: 500 });
  }
}
