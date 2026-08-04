import { NextResponse } from "next/server";
import { getCohortAnalyticsRepository } from "../../../../server/runtime";
import { evaluateCohortReadiness } from "../../../../server/cohort-readiness";
import { hasOpsSession } from "../../../../server/ops-session";

export async function GET() {
  if (!(await hasOpsSession())) return NextResponse.json({ code: "OPS_UNAUTHENTICATED" }, { status: 401 });
  const cohorts = await getCohortAnalyticsRepository().list(100);
  return NextResponse.json({
    cohorts: cohorts.map((cohort) => ({ ...cohort, readiness: evaluateCohortReadiness(cohort) })),
  });
}
