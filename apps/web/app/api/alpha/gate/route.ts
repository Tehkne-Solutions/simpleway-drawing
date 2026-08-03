import { NextResponse } from "next/server";
import { logServerError } from "../../../../server/logger";
import { assertSameOrigin, securityErrorResponse } from "../../../../server/request-security";
import { getAlphaRepository } from "../../../../server/runtime";
import { requireSessionUserId } from "../../../../server/session";

export async function GET() {
  try {
    const userId = await requireSessionUserId();
    return NextResponse.json(await getAlphaRepository().getSnapshot(userId), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ALPHA_GATE_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500, headers: { "cache-control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireSessionUserId();
    const snapshot = await getAlphaRepository().recordGateMilestone(userId);
    const accepted = snapshot.status === "READY" || snapshot.status === "READY_WITH_REVIEW";
    return NextResponse.json(snapshot, { status: accepted ? 200 : 409, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "ALPHA_GATE_FAILED";
    if (code !== "UNAUTHENTICATED") logServerError("alpha.gate_milestone_failed", request, error);
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500, headers: { "cache-control": "no-store" } });
  }
}
