import { NextResponse } from "next/server";
import { getOperationsRepository } from "../../../../server/runtime";
import { hasOpsSession } from "../../../../server/ops-session";

export async function GET() {
  if (!(await hasOpsSession())) return NextResponse.json({ code: "OPS_UNAUTHENTICATED" }, { status: 401 });
  return NextResponse.json({ interventions: await getOperationsRepository().getInterventionQueue(100) });
}
