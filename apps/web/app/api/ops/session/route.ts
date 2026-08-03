import { NextResponse } from "next/server";
import { isValidOpsToken } from "../../../../server/ops-auth";
import { clearOpsSession, setOpsSession } from "../../../../server/ops-session";
import { readJsonBody, securityErrorResponse } from "../../../../server/request-security";

type Input = { token?: string };

export async function POST(request: Request) {
  try {
    const input = await readJsonBody<Input>(request, 4_096);
    if (!isValidOpsToken(input.token)) {
      return NextResponse.json({ code: "OPS_AUTH_INVALID" }, { status: 401 });
    }
    await setOpsSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    return NextResponse.json({ code: "OPS_SESSION_FAILED" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearOpsSession();
  return NextResponse.json({ ok: true });
}
