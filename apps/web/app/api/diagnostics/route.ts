import { NextResponse } from "next/server";
import { getClosedAlphaRepository } from "../../../server/runtime";
import { getSessionUserId } from "../../../server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401, headers: { "cache-control": "no-store" } });
  const diagnostics = await getClosedAlphaRepository().getDiagnostics(userId);
  return NextResponse.json({ diagnostics }, { headers: { "cache-control": "no-store" } });
}
