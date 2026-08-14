import assert from "node:assert/strict";
import test from "node:test";
import type { CreativeTerritory } from "./atlas-world";
import { derivePlayerContinuity } from "./player-continuity";

const activation = (stage: string, completedSteps: number, totalSteps: number, progress: number) => ({
  stage,
  completedSteps,
  totalSteps,
  progress,
  nextAction: { title: "Continuar Foundation", description: "Próxima missão Foundation", href: "/learn/c2/lesson.swd.c2.size_proportion" },
});

const territory = (key: CreativeTerritory["key"], complete: boolean, evidenceCount = 0): CreativeTerritory => ({
  key,
  title: key === "synthesis" ? "Santuário da Síntese" : key === "narrative" ? "Arquivo das Vistas" : "Prisma dos Três Eixos",
  discipline: key,
  description: `Território ${key}`,
  href: key === "synthesis" ? "/create/pixel/quest" : key === "narrative" ? "/create/manga" : "/create/isometric",
  glyph: "◇",
  reward: `Relíquia ${key}`,
  complete,
  progress: complete ? 1 : 0,
  completedSteps: complete ? 1 : 0,
  totalSteps: 1,
  evidenceCount,
  masteryScore: evidenceCount ? .75 : null,
  masteryLevel: evidenceCount ? "DEVELOPING" : null,
  skillKeys: [`skill.${key}`],
});

test("continuity keeps Foundation authoritative until Alpha activation is complete", () => {
  const result = derivePlayerContinuity(activation("FOUNDATION", 4, 6, 4 / 6), [
    territory("synthesis", false, 1), territory("narrative", false), territory("structure", false),
  ]);
  assert.equal(result.phase, "FOUNDATION");
  assert.equal(result.nextAction.kind, "foundation");
  assert.equal(result.nextAction.href, "/learn/c2/lesson.swd.c2.size_proportion");
  assert.equal(result.focusProgress, 4 / 6);
});

test("after Alpha continuity enters creative world and resumes the territory in progress", () => {
  const result = derivePlayerContinuity(activation("COMPLETE", 6, 6, 1), [
    territory("synthesis", false), territory("narrative", false, 1), territory("structure", false),
  ]);
  assert.equal(result.phase, "CREATIVE_WORLD");
  assert.equal(result.nextAction.kind, "creative");
  assert.equal(result.nextAction.href, "/create/manga");
  assert.equal(result.creative.completed, 0);
});

test("continuity opens the Work Chamber only after all creative territories are complete", () => {
  const result = derivePlayerContinuity(activation("COMPLETE", 6, 6, 1), [
    territory("synthesis", true, 4), territory("narrative", true, 1), territory("structure", true, 1),
  ]);
  assert.equal(result.phase, "AUTHORING");
  assert.equal(result.nextAction.kind, "capstone");
  assert.equal(result.nextAction.href, "/create/work");
  assert.equal(result.worldProgress, 1);
  assert.equal(result.completedMilestones, result.totalMilestones);
});
