import { NextResponse } from "next/server";
import { logServerError } from "../../../server/logger";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../server/request-security";
import { getConstructionRepository } from "../../../server/runtime";
import { requireSessionUserId } from "../../../server/session";

interface Body {
  exerciseKey?: string;
  answerIndex?: number;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireSessionUserId();
    const body = await readJsonBody<Body>(request, 4_096);
    if (typeof body.exerciseKey !== "string" || !Number.isInteger(body.answerIndex)) {
      return NextResponse.json({ code: "INVALID_CONSTRUCTION_SUBMISSION" }, { status: 400 });
    }
    const result = await getConstructionRepository().submitChoice(userId, body.exerciseKey, body.answerIndex as number);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "CONSTRUCTION_SUBMIT_FAILED";
    if (code !== "UNAUTHENTICATED" && !code.startsWith("INVALID_") && !code.endsWith("NOT_SUPPORTED")) {
      logServerError("construction.submit_failed", request, error);
    }
    const status = code === "UNAUTHENTICATED" ? 401 : code.startsWith("INVALID_") || code.endsWith("NOT_SUPPORTED") ? 400 : 500;
    return NextResponse.json({ code }, { status, headers: { "cache-control": "no-store" } });
  }
}
