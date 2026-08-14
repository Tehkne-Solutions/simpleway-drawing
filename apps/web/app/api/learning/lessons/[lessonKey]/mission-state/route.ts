import { NextResponse } from "next/server";
import { getFoundationMissionState, resolveFoundationLesson } from "../../../../../../server/foundation-mission-state";
import { logServerError } from "../../../../../../server/logger";
import { requireSessionUserId } from "../../../../../../server/session";

export async function GET(request: Request, context: { params: Promise<{ lessonKey: string }> }) {
  try {
    const userId = await requireSessionUserId();
    const { lessonKey } = await context.params;
    const lesson = resolveFoundationLesson(lessonKey);
    if (!lesson) return NextResponse.json({ code: "LESSON_NOT_FOUND" }, { status: 404, headers: { "cache-control": "no-store" } });
    const state = await getFoundationMissionState(userId, lesson);
    return NextResponse.json(state, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "MISSION_STATE_FAILED";
    if (code !== "UNAUTHENTICATED") logServerError("learning.mission_state_failed", request, error);
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500, headers: { "cache-control": "no-store" } });
  }
}
