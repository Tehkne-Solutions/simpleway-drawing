import { NextResponse } from "next/server";
import { logServerError } from "../../../server/logger";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../server/request-security";
import { getFormRepository } from "../../../server/runtime";
import { requireSessionUserId } from "../../../server/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireSessionUserId();
    const body = await readJsonBody<{ exerciseKey?: string; answerIndex?: number }>(request, 4_096);
    if (!body.exerciseKey || !Number.isInteger(body.answerIndex)) {
      return NextResponse.json({ code: "INVALID_FORM_SUBMISSION" }, { status: 400 });
    }
    const result = await getFormRepository().submitChoice(userId, body.exerciseKey, body.answerIndex as number);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "FORM_SUBMIT_FAILED";
    if (code !== "UNAUTHENTICATED" && code !== "FORM_EXERCISE_NOT_SUPPORTED" && code !== "INVALID_FORM_ANSWER") {
      logServerError("form.submit_failed", request, error);
    }
    const status = code === "UNAUTHENTICATED" ? 401 : code === "FORM_EXERCISE_NOT_SUPPORTED" || code === "INVALID_FORM_ANSWER" ? 400 : 500;
    return NextResponse.json({ code }, { status, headers: { "cache-control": "no-store" } });
  }
}
