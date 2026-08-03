import { NextResponse } from "next/server";
import { logServerError } from "../../../../server/logger";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../../server/request-security";
import { getGymRepository } from "../../../../server/runtime";
import { requireSessionUserId } from "../../../../server/session";

type Payload = {
  exerciseKey?: unknown;
  accuracy?: unknown;
  smoothness?: unknown;
  durationMs?: unknown;
  pointCount?: unknown;
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireSessionUserId();
    const body = await readJsonBody<Payload>(request, 4_096);
    if (
      typeof body.exerciseKey !== "string" ||
      !finite(body.accuracy) || !finite(body.smoothness) || !finite(body.durationMs) || !finite(body.pointCount) ||
      body.accuracy < 0 || body.accuracy > 1 || body.smoothness < 0 || body.smoothness > 1 ||
      body.durationMs <= 0 || body.durationMs > 30_000 || body.pointCount < 2 || body.pointCount > 10_000
    ) {
      return NextResponse.json({ code: "INVALID_GYM_METRICS" }, { status: 400 });
    }
    const result = await getGymRepository().submitMotorDrill(userId, body.exerciseKey, {
      accuracy: body.accuracy,
      smoothness: body.smoothness,
      durationMs: body.durationMs,
      pointCount: Math.round(body.pointCount),
    });
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "GYM_SUBMIT_FAILED";
    if (code !== "UNAUTHENTICATED" && code !== "GYM_EXERCISE_NOT_SUPPORTED") logServerError("gym.motor_drill_failed", request, error);
    const status = code === "UNAUTHENTICATED" ? 401 : code === "GYM_EXERCISE_NOT_SUPPORTED" ? 400 : 500;
    return NextResponse.json({ code }, { status, headers: { "cache-control": "no-store" } });
  }
}
