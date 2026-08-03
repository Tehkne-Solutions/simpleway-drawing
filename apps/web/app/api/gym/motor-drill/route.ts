import { NextResponse } from "next/server";
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
    const userId = await requireSessionUserId();
    const body = (await request.json()) as Payload;
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
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "GYM_SUBMIT_FAILED";
    const status = code === "UNAUTHENTICATED" ? 401 : code === "GYM_EXERCISE_NOT_SUPPORTED" ? 400 : 500;
    return NextResponse.json({ code }, { status });
  }
}
