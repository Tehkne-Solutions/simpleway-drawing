import { NextResponse } from "next/server";
import { evaluateLaunchIncidents } from "../../../../server/launch-incidents";
import { getClosedAlphaFeedbackRepository, getOperationsRepository } from "../../../../server/runtime";
import { hasOpsSession } from "../../../../server/ops-session";

export async function GET() {
  if (!(await hasOpsSession())) return NextResponse.json({ code: "OPS_UNAUTHENTICATED" }, { status: 401 });
  const [feedback, interventions] = await Promise.all([
    getClosedAlphaFeedbackRepository().listAllRecent(100),
    getOperationsRepository().getInterventionQueue(100),
  ]);
  return NextResponse.json(evaluateLaunchIncidents({ feedback, interventions }));
}
