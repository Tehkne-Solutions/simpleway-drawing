import { getFoundationLesson } from "@swd/content";
import { getC2Lesson } from "@swd/content/c2";
import { getC3Lesson } from "@swd/content/c3";
import { getC4Lesson } from "@swd/content/c4";
import { NextResponse } from "next/server";
import { logServerError } from "../../../../../../server/logger";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../../../../server/request-security";
import { getLearningProgressRepository } from "../../../../../../server/runtime";
import { requireSessionUserId } from "../../../../../../server/session";

export async function POST(request: Request, context: { params: Promise<{ lessonKey: string }> }) {
  try {
    assertSameOrigin(request);
    const userId = await requireSessionUserId();
    const { lessonKey } = await context.params;
    const lesson = getFoundationLesson(lessonKey) ?? getC2Lesson(lessonKey) ?? getC3Lesson(lessonKey) ?? getC4Lesson(lessonKey);
    if (!lesson) return NextResponse.json({ code: "LESSON_NOT_FOUND" }, { status: 404 });

    const body = await readJsonBody<{ reflection?: Record<string, unknown> }>(request, 16_384);
    const reflection = body.reflection && typeof body.reflection === "object" && !Array.isArray(body.reflection) ? body.reflection : {};
    const result = await getLearningProgressRepository().completeLesson({ userId, lessonKey: lesson.key, lessonVersion: lesson.version, reflection });
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "LESSON_COMPLETE_FAILED";
    if (code !== "DRAWING_ZERO_REQUIRED" && code !== "LESSON_PREREQUISITES_REQUIRED" && code !== "CYCLE_PREREQUISITE_REQUIRED" && code !== "LESSON_NOT_IN_FOUNDATION" && code !== "UNAUTHENTICATED") {
      logServerError("learning.lesson_complete_failed", request, error);
    }
    const status = code === "UNAUTHENTICATED" ? 401
      : code === "DRAWING_ZERO_REQUIRED" || code === "LESSON_PREREQUISITES_REQUIRED" || code === "CYCLE_PREREQUISITE_REQUIRED" ? 409
        : code === "LESSON_NOT_IN_FOUNDATION" ? 400 : 500;
    return NextResponse.json({ code }, { status, headers: { "cache-control": "no-store" } });
  }
}
