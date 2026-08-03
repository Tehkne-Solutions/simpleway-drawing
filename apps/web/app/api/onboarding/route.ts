import { outboxEvents, profiles } from "@swd/database";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "../../../server/runtime";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../server/request-security";
import { getSessionUserId } from "../../../server/session";

const paths = new Set(["MANGA", "COMIC", "REALISTIC", "EXPLORE"]);
const experienceLevels = new Set(["NEW", "BEGINNER", "RETURNING", "PRACTICING"]);
const goals = new Set(["LEARN", "CREATE", "CAREER", "IMPROVE"]);
const tools = new Set(["PAPER", "DIGITAL", "BOTH"]);

type OnboardingInput = {
  displayName?: string;
  preferredPath?: string;
  experienceLevel?: string;
  primaryGoal?: string;
  preferredTool?: string;
};

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 80) return null;
  return normalized;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });

    const input = await readJsonBody<OnboardingInput>(request, 8_192);
    const displayName = normalizeName(input.displayName);
    const preferredPath = typeof input.preferredPath === "string" && paths.has(input.preferredPath) ? input.preferredPath : null;
    const experienceLevel = typeof input.experienceLevel === "string" && experienceLevels.has(input.experienceLevel) ? input.experienceLevel : null;
    const primaryGoal = typeof input.primaryGoal === "string" && goals.has(input.primaryGoal) ? input.primaryGoal : null;
    const preferredTool = typeof input.preferredTool === "string" && tools.has(input.preferredTool) ? input.preferredTool : null;

    if (!displayName || !preferredPath || !experienceLevel || !primaryGoal || !preferredTool) {
      return NextResponse.json({ code: "INVALID_ONBOARDING_INPUT" }, { status: 400 });
    }

    const db = getDatabase();
    const completedAt = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({
          displayName,
          preferredPath,
          experienceLevel,
          primaryGoal,
          preferredTool,
          onboardingCompletedAt: completedAt,
          updatedAt: completedAt,
        })
        .where(eq(profiles.userId, userId));

      await tx.insert(outboxEvents).values({
        eventType: "identity.onboarding.completed.v1",
        aggregateType: "user",
        aggregateId: userId,
        payload: {
          preferredPath,
          experienceLevel,
          primaryGoal,
          preferredTool,
        },
      });
    });

    return NextResponse.json({
      profile: { displayName, preferredPath, experienceLevel, primaryGoal, preferredTool },
      next: "/drawing-zero",
    });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    return NextResponse.json({ code: "ONBOARDING_SAVE_FAILED" }, { status: 500 });
  }
}
