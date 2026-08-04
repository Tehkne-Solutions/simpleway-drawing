import { NextResponse } from "next/server";
import { getOperationsRepository } from "../../../../server/runtime";
import { hasOpsSession } from "../../../../server/ops-session";
import { readJsonBody, securityErrorResponse } from "../../../../server/request-security";

type LifecycleInput = {
  userId?: string;
  status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  note?: string | null;
};

const allowedStatuses = new Set(["OPEN", "ACKNOWLEDGED", "RESOLVED"]);

export async function GET() {
  if (!(await hasOpsSession())) return NextResponse.json({ code: "OPS_UNAUTHENTICATED" }, { status: 401 });
  return NextResponse.json({ interventions: await getOperationsRepository().getInterventionQueue(100) });
}

export async function POST(request: Request) {
  try {
    if (!(await hasOpsSession())) return NextResponse.json({ code: "OPS_UNAUTHENTICATED" }, { status: 401 });
    const input = await readJsonBody<LifecycleInput>(request, 8_192);
    if (!input.userId) return NextResponse.json({ code: "INTERVENTION_USER_REQUIRED" }, { status: 400 });
    if (!input.status || !allowedStatuses.has(input.status)) {
      return NextResponse.json({ code: "INTERVENTION_STATUS_INVALID" }, { status: 400 });
    }
    if ((input.note?.length ?? 0) > 500) return NextResponse.json({ code: "INTERVENTION_NOTE_TOO_LONG" }, { status: 400 });

    const event = await getOperationsRepository().recordInterventionLifecycle({
      userId: input.userId,
      status: input.status,
      ...(input.note !== undefined ? { note: input.note } : {}),
    });
    return NextResponse.json({ ok: true, event }, { status: 201 });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "INTERVENTION_UPDATE_FAILED";
    return NextResponse.json({ code }, { status: code === "TESTER_NOT_FOUND" ? 404 : 500 });
  }
}
