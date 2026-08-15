import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "simpleway-drawing-web",
    release: {
      sha: process.env.SWD_RELEASE_SHA ?? "unknown",
      ref: process.env.SWD_RELEASE_REF ?? "unknown",
    },
    timestamp: new Date().toISOString(),
  }, {
    headers: { "cache-control": "no-store" },
  });
}
