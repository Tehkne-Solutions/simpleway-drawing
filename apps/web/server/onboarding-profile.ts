export type PreferredPath = "MANGA" | "COMIC" | "REALISTIC" | "EXPLORE";
export type ExperienceLevel = "NEW" | "BEGINNER" | "RETURNING" | "PRACTICING";
export type PrimaryGoal = "LEARN" | "CREATE" | "CAREER" | "IMPROVE";
export type PreferredTool = "PAPER" | "DIGITAL" | "BOTH";

export type OnboardingProfile = {
  displayName: string;
  preferredPath: PreferredPath;
  experienceLevel: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  preferredTool: PreferredTool;
};

const paths = new Set<PreferredPath>(["MANGA", "COMIC", "REALISTIC", "EXPLORE"]);
const experienceLevels = new Set<ExperienceLevel>(["NEW", "BEGINNER", "RETURNING", "PRACTICING"]);
const goals = new Set<PrimaryGoal>(["LEARN", "CREATE", "CAREER", "IMPROVE"]);
const tools = new Set<PreferredTool>(["PAPER", "DIGITAL", "BOTH"]);

function isMember<T extends string>(set: ReadonlySet<T>, value: unknown): value is T {
  return typeof value === "string" && set.has(value as T);
}

export function normalizeOnboardingProfile(input: Record<string, unknown>): OnboardingProfile | null {
  const rawName = typeof input.displayName === "string" ? input.displayName.trim().replace(/\s+/g, " ") : "";
  if (rawName.length < 2 || rawName.length > 80) return null;
  if (!isMember(paths, input.preferredPath)) return null;
  if (!isMember(experienceLevels, input.experienceLevel)) return null;
  if (!isMember(goals, input.primaryGoal)) return null;
  if (!isMember(tools, input.preferredTool)) return null;

  return {
    displayName: rawName,
    preferredPath: input.preferredPath,
    experienceLevel: input.experienceLevel,
    primaryGoal: input.primaryGoal,
    preferredTool: input.preferredTool,
  };
}
