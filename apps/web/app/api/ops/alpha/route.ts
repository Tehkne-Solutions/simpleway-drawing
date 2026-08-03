import { NextResponse } from "next/server";
import { isValidOpsAuthorization } from "../../../../server/ops-auth";
import { getOperationsRepository } from "../../../../server/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isValidOpsAuthorization(request)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const overview = await getOperationsRepository().getOverview();
  return NextResponse.json({ overview }, { headers: { "cache-control": "no-store" } });
}
