import { profiles, users } from "@swd/database";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { logServerError } from "../../../../server/logger";
import { getDatabase, getOperationsRepository } from "../../../../server/runtime";
import { assertSameOrigin, securityErrorResponse } from "../../../../server/request-security";
import { getSessionUserId, setSessionCookie } from "../../../../server/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const existing = await getSessionUserId();
    if (existing) {
      await getOperationsRepository().markSession(existing);
      return NextResponse.json({ userId: existing });
    }

    const id = randomUUID();
    const db = getDatabase();
    await db.transaction(async (tx) => {
      await tx.insert(users).values({ id, email: `guest+${id}@simpleway.local`, status: "GUEST" });
      await tx.insert(profiles).values({ userId: id, displayName: "Artista em formação" });
    });

    await getOperationsRepository().markSession(id);
    await setSessionCookie(id);
    return NextResponse.json({ userId: id }, { status: 201 });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    logServerError("session.guest.create_failed", request, error);
    return NextResponse.json({ code: "SESSION_CREATE_FAILED" }, { status: 500 });
  }
}
