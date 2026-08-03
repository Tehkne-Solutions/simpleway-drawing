import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOnboardingProfile } from "./onboarding-profile";

test("normalizes a valid onboarding profile", () => {
  const profile = normalizeOnboardingProfile({
    displayName: "  Ana   Artista ",
    preferredPath: "MANGA",
    experienceLevel: "NEW",
    primaryGoal: "CAREER",
    preferredTool: "BOTH",
  });

  assert.deepEqual(profile, {
    displayName: "Ana Artista",
    preferredPath: "MANGA",
    experienceLevel: "NEW",
    primaryGoal: "CAREER",
    preferredTool: "BOTH",
  });
});

test("rejects unknown onboarding taxonomy values", () => {
  const profile = normalizeOnboardingProfile({
    displayName: "Ana",
    preferredPath: "ANIME_ONLY",
    experienceLevel: "NEW",
    primaryGoal: "CAREER",
    preferredTool: "BOTH",
  });

  assert.equal(profile, null);
});

test("rejects invalid display names", () => {
  assert.equal(normalizeOnboardingProfile({
    displayName: "A",
    preferredPath: "EXPLORE",
    experienceLevel: "BEGINNER",
    primaryGoal: "LEARN",
    preferredTool: "PAPER",
  }), null);
});
