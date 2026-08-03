import { outboxEvents, profiles } from "@swd/database";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { normalizeOnboardingProfile } from "../../../server/onboarding-profile";
import { getDatabase } from "../../../server/runtime";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../server/request-security";
import { getSessionUserId } from "../../../server/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });

    const raw = await readJsonBody<Record<string, unknown>>(request, 8_192);
    const profile = normalizeOnboardingProfile(raw);
    if (!profile) return NextResponse.json({ code: "INVALID_ONBOARDING_INPUT" }, { status: 400 });

    const db = getDatabase();
    const completedAt = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({
          ...profile,
          onboardingCompletedAt: completedAt,
          updatedAt: completedAt,
        })
        .where(eq(profiles.userId, userId));

      await tx.insert(outboxEvents).values({
        eventType: "identity.onboarding.completed.v1",
        aggregateType: "user",
        aggregateId: userId,
        payload: {
          preferredPath: profile.preferredPath,
          experienceLevel: profile.experienceLevel,
          primaryGoal: profile.primaryGoal,
          preferredTool: profile.preferredTool,
        },
      });
    });

    return NextResponse.json({ profile, next: "/drawing-zero" });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    return NextResponse.json({ code: "ONBOARDING_SAVE_FAILED" }, { status: 500 });
  }
}
