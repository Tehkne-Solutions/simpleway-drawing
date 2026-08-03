import { profiles, users } from "@swd/database";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "../../../../server/runtime";
import { getSessionUserId, setSessionCookie } from "../../../../server/session";

export async function POST() {
  const existing = await getSessionUserId();
  if (existing) return NextResponse.json({ userId: existing });

  const id = randomUUID();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      email: `guest+${id}@simpleway.local`,
      status: "GUEST",
    });
    await tx.insert(profiles).values({ userId: id, displayName: "Artista em formação" });
  });

  await setSessionCookie(id);
  return NextResponse.json({ userId: id }, { status: 201 });
}
