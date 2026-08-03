import { NextResponse } from "next/server";
import { getConstructionRepository } from "../../../server/runtime";
import { requireSessionUserId } from "../../../server/session";

interface Body {
  exerciseKey?: string;
  answerIndex?: number;
}

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = (await request.json()) as Body;
    if (typeof body.exerciseKey !== "string" || !Number.isInteger(body.answerIndex)) {
      return NextResponse.json({ code: "INVALID_CONSTRUCTION_SUBMISSION" }, { status: 400 });
    }
    const result = await getConstructionRepository().submitChoice(userId, body.exerciseKey, body.answerIndex as number);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "CONSTRUCTION_SUBMIT_FAILED";
    const status = code === "UNAUTHENTICATED" ? 401 : code.startsWith("INVALID_") || code.endsWith("NOT_SUPPORTED") ? 400 : 500;
    return NextResponse.json({ code }, { status });
  }
}
