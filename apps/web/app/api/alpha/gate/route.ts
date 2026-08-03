import { NextResponse } from "next/server";
import { getAlphaRepository } from "../../../../server/runtime";
import { requireSessionUserId } from "../../../../server/session";

export async function GET() {
  try {
    const userId = await requireSessionUserId();
    return NextResponse.json(await getAlphaRepository().getSnapshot(userId));
  } catch (error) {
    const code = error instanceof Error ? error.message : "ALPHA_GATE_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST() {
  try {
    const userId = await requireSessionUserId();
    const snapshot = await getAlphaRepository().recordGateMilestone(userId);
    const accepted = snapshot.status === "READY" || snapshot.status === "READY_WITH_REVIEW";
    return NextResponse.json(snapshot, { status: accepted ? 200 : 409 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ALPHA_GATE_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
