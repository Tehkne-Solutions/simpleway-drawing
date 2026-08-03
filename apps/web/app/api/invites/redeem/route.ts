import { NextResponse } from "next/server";
import { getInvitationRepository, getOperationsRepository } from "../../../../server/runtime";
import { readJsonBody, securityErrorResponse } from "../../../../server/request-security";
import { getSessionUserId, setSessionCookie } from "../../../../server/session";

type Input = { code?: string };

export async function POST(request: Request) {
  try {
    const existing = await getSessionUserId();
    if (existing) return NextResponse.json({ userId: existing, next: "/resume" });

    const input = await readJsonBody<Input>(request, 4_096);
    if (!input.code) return NextResponse.json({ code: "INVITE_CODE_REQUIRED" }, { status: 400 });

    const result = await getInvitationRepository().redeem(input.code);
    await setSessionCookie(result.userId);
    await getOperationsRepository().markSession(result.userId);
    return NextResponse.json({ userId: result.userId, inviteLabel: result.invite.label, next: "/onboarding" }, { status: 201 });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "INVITE_REDEEM_FAILED";
    return NextResponse.json({ code }, { status: code === "INVITE_INVALID_OR_EXPIRED" || code === "INVITE_INVALID" ? 410 : 400 });
  }
}
