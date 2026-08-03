import { NextResponse } from "next/server";
import { getFormRepository } from "../../../server/runtime";
import { requireSessionUserId } from "../../../server/session";

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = (await request.json()) as { exerciseKey?: string; answerIndex?: number };
    if (!body.exerciseKey || typeof body.answerIndex !== "number") {
      return NextResponse.json({ code: "INVALID_FORM_SUBMISSION" }, { status: 400 });
    }
    const result = await getFormRepository().submitChoice(userId, body.exerciseKey, body.answerIndex);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "FORM_SUBMIT_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
