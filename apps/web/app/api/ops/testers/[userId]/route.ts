import { NextResponse } from "next/server";
import { getOperationsRepository } from "../../../../../server/runtime";
import { hasOpsSession } from "../../../../../server/ops-session";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!(await hasOpsSession())) return NextResponse.json({ code: "OPS_UNAUTHENTICATED" }, { status: 401 });
  const { userId } = await params;
  const tester = await getOperationsRepository().getTesterSnapshot(userId);
  if (!tester) return NextResponse.json({ code: "TESTER_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ tester });
}
