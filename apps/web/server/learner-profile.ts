import { profiles } from "@swd/database";
import { eq } from "drizzle-orm";
import { getDatabase } from "./runtime";

export type LearnerProfileSnapshot = {
  displayName: string | null;
  preferredPath: string | null;
  experienceLevel: string | null;
  primaryGoal: string | null;
  preferredTool: string | null;
  onboardingComplete: boolean;
};

export async function getLearnerProfile(userId: string): Promise<LearnerProfileSnapshot | null> {
  const [profile] = await getDatabase()
    .select({
      displayName: profiles.displayName,
      preferredPath: profiles.preferredPath,
      experienceLevel: profiles.experienceLevel,
      primaryGoal: profiles.primaryGoal,
      preferredTool: profiles.preferredTool,
      onboardingCompletedAt: profiles.onboardingCompletedAt,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (!profile) return null;
  return {
    displayName: profile.displayName,
    preferredPath: profile.preferredPath,
    experienceLevel: profile.experienceLevel,
    primaryGoal: profile.primaryGoal,
    preferredTool: profile.preferredTool,
    onboardingComplete: Boolean(profile.onboardingCompletedAt),
  };
}
