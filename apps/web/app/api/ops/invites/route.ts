import { NextResponse } from "next/server";
import { getInvitationRepository } from "../../../../server/runtime";
import { hasOpsSession } from "../../../../server/ops-session";
import { readJsonBody, securityErrorResponse } from "../../../../server/request-security";

type CreateInput = { label?: string; maxUses?: number; expiresInDays?: number };
type DeleteInput = { id?: string };

export async function GET() {
  if (!(await hasOpsSession())) return NextResponse.json({ code: "OPS_UNAUTHENTICATED" }, { status: 401 });
  return NextResponse.json({ invites: await getInvitationRepository().list() });
}

export async function POST(request: Request) {
  try {
    if (!(await hasOpsSession())) return NextResponse.json({ code: "OPS_UNAUTHENTICATED" }, { status: 401 });
    const input = await readJsonBody<CreateInput>(request, 8_192);
    const expiresInDays = Math.max(1, Math.min(Number(input.expiresInDays ?? 7), 90));
    const result = await getInvitationRepository().create({
      label: input.label ?? "",
      maxUses: Number(input.maxUses ?? 1),
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    return NextResponse.json({ code: error instanceof Error ? error.message : "INVITE_CREATE_FAILED" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await hasOpsSession())) return NextResponse.json({ code: "OPS_UNAUTHENTICATED" }, { status: 401 });
    const input = await readJsonBody<DeleteInput>(request, 4_096);
    if (!input.id) return NextResponse.json({ code: "INVITE_ID_REQUIRED" }, { status: 400 });
    await getInvitationRepository().revoke(input.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    return NextResponse.json({ code: "INVITE_REVOKE_FAILED" }, { status: 500 });
  }
}
