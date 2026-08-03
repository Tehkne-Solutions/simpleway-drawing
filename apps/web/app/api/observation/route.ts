import { NextResponse } from "next/server";
import { getObservationRepository } from "../../../server/runtime";
import { requireSessionUserId } from "../../../server/session";

export async function GET() {
  const exercises = getObservationRepository().listExercises();
  return NextResponse.json({ exercises });
}

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = (await request.json()) as { exerciseKey?: unknown; answerIndex?: unknown; responseMs?: unknown };
    if (
      typeof body.exerciseKey !== "string" ||
      typeof body.answerIndex !== "number" || !Number.isInteger(body.answerIndex) ||
      typeof body.responseMs !== "number" || !Number.isFinite(body.responseMs) || body.responseMs < 0 || body.responseMs > 120_000
    ) {
      return NextResponse.json({ code: "INVALID_OBSERVATION_INPUT" }, { status: 400 });
    }
    const result = await getObservationRepository().submitChoice(userId, body.exerciseKey, body.answerIndex, body.responseMs);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "OBSERVATION_SUBMIT_FAILED";
    const status = code === "UNAUTHENTICATED" ? 401 : code === "OBSERVATION_EXERCISE_NOT_SUPPORTED" || code === "INVALID_OBSERVATION_ANSWER" ? 400 : 500;
    return NextResponse.json({ code }, { status });
  }
}
