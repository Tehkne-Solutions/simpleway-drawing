import { getC0Lesson } from "@swd/content";
import { NextResponse } from "next/server";
import { getLearningProgressRepository } from "../../../../../../server/runtime";
import { requireSessionUserId } from "../../../../../../server/session";

export async function POST(
  request: Request,
  context: { params: Promise<{ lessonKey: string }> },
) {
  try {
    const userId = await requireSessionUserId();
    const { lessonKey } = await context.params;
    const lesson = getC0Lesson(lessonKey);
    if (!lesson) return NextResponse.json({ code: "LESSON_NOT_FOUND" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as { reflection?: Record<string, unknown> };
    const result = await getLearningProgressRepository().completeLesson({
      userId,
      lessonKey: lesson.key,
      lessonVersion: lesson.version,
      reflection: body.reflection ?? {},
    });

    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "LESSON_COMPLETE_FAILED";
    const status = code === "UNAUTHENTICATED"
      ? 401
      : code === "DRAWING_ZERO_REQUIRED" || code === "LESSON_PREREQUISITES_REQUIRED"
        ? 409
        : code === "LESSON_NOT_IN_C0"
          ? 400
          : 500;
    return NextResponse.json({ code }, { status });
  }
}
