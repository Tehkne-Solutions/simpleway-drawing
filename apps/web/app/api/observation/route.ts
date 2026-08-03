import { NextResponse } from "next/server";
import { logServerError } from "../../../server/logger";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../server/request-security";
import { getObservationRepository } from "../../../server/runtime";
import { requireSessionUserId } from "../../../server/session";

export async function GET() {
  const exercises = getObservationRepository().listExercises();
  return NextResponse.json({ exercises }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireSessionUserId();
    const body = await readJsonBody<{ exerciseKey?: unknown; answerIndex?: unknown; responseMs?: unknown }>(request, 4_096);
    if (
      typeof body.exerciseKey !== "string" ||
      typeof body.answerIndex !== "number" || !Number.isInteger(body.answerIndex) ||
      typeof body.responseMs !== "number" || !Number.isFinite(body.responseMs) || body.responseMs < 0 || body.responseMs > 120_000
    ) {
      return NextResponse.json({ code: "INVALID_OBSERVATION_INPUT" }, { status: 400 });
    }
    const result = await getObservationRepository().submitChoice(userId, body.exerciseKey, body.answerIndex, body.responseMs);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "OBSERVATION_SUBMIT_FAILED";
    if (code !== "UNAUTHENTICATED" && code !== "OBSERVATION_EXERCISE_NOT_SUPPORTED" && code !== "INVALID_OBSERVATION_ANSWER") {
      logServerError("observation.submit_failed", request, error);
    }
    const status = code === "UNAUTHENTICATED" ? 401 : code === "OBSERVATION_EXERCISE_NOT_SUPPORTED" || code === "INVALID_OBSERVATION_ANSWER" ? 400 : 500;
    return NextResponse.json({ code }, { status, headers: { "cache-control": "no-store" } });
  }
}
