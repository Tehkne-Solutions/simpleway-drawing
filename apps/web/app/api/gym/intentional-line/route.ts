import { NextResponse } from "next/server";
import { getGymRepository } from "../../../../server/runtime";
import { requireSessionUserId } from "../../../../server/session";

interface Body {
  accuracy?: number;
  smoothness?: number;
  durationMs?: number;
  pointCount?: number;
}

function validMetric(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = (await request.json()) as Body;
    if (
      !validMetric(body.accuracy) || !validMetric(body.smoothness) ||
      !validMetric(body.durationMs) || !validMetric(body.pointCount) ||
      body.accuracy < 0 || body.accuracy > 1 || body.smoothness < 0 || body.smoothness > 1 ||
      body.durationMs <= 0 || body.durationMs > 30_000 || body.pointCount < 2 || body.pointCount > 10_000
    ) {
      return NextResponse.json({ code: "INVALID_GYM_METRICS" }, { status: 400 });
    }

    const result = await getGymRepository().submitIntentionalLine(userId, {
      accuracy: body.accuracy,
      smoothness: body.smoothness,
      durationMs: body.durationMs,
      pointCount: Math.round(body.pointCount),
    });
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "GYM_SUBMIT_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
