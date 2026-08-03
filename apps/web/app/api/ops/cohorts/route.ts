import { NextResponse } from "next/server";
import { getCohortAnalyticsRepository } from "../../../../server/runtime";
import { hasOpsSession } from "../../../../server/ops-session";

export async function GET() {
  if (!(await hasOpsSession())) return NextResponse.json({ code: "OPS_UNAUTHENTICATED" }, { status: 401 });
  return NextResponse.json({ cohorts: await getCohortAnalyticsRepository().list(100) });
}
