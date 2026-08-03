import { NextResponse } from "next/server";
import { getClosedAlphaRepository, getOperationsRepository } from "../../../../server/runtime";
import { getSessionUserId } from "../../../../server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401, headers: { "cache-control": "no-store" } });

  const [diagnostics, operationalSummary] = await Promise.all([
    getClosedAlphaRepository().getDiagnostics(userId),
    getOperationsRepository().getTesterSnapshot(userId),
  ]);

  const body = JSON.stringify({
    exportVersion: "closed-alpha-data-export-v1",
    generatedAt: new Date().toISOString(),
    userId,
    diagnostics,
    operationalSummary,
  }, null, 2);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="simpleway-drawing-alpha-${userId.slice(0, 8)}.json"`,
      "cache-control": "no-store",
    },
  });
}
