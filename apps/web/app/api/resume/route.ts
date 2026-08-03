import { NextResponse } from "next/server";
import { getActivationRepository } from "../../../server/runtime";
import { getSessionUserId } from "../../../server/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401, headers: { "cache-control": "no-store" } });

  const activation = await getActivationRepository().getSnapshot(userId);
  return NextResponse.json({ activation }, { headers: { "cache-control": "no-store" } });
}
