import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase, getStorage } from "../../../server/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const [database, storage] = await Promise.allSettled([
    getDatabase().execute(sql`select 1`),
    getStorage().checkReadiness(),
  ]);

  const databaseStatus = database.status === "fulfilled" ? "ok" : "unavailable";
  const storageStatus = storage.status === "fulfilled" ? "ok" : "unavailable";
  const ready = databaseStatus === "ok" && storageStatus === "ok";

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      database: databaseStatus,
      storage: storageStatus,
    },
    {
      status: ready ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
