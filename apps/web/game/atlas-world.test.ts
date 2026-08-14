import assert from "node:assert/strict";
import test from "node:test";
import { creativeWorldSummary, deriveCreativeTerritories, nextAtlasMission } from "./atlas-world";

const state = (skillKey: string, evidenceCount: number, masteryScore: number | null, masteryLevel: string | null = "DEVELOPING") => ({ skillKey, evidenceCount, masteryScore, masteryLevel });

test("creative territories are derived only from authoritative evidence snapshots", () => {
  const territories = deriveCreativeTerritories({
    completedMissionIds: ["pixel", "sprite"], completedCount: 2, complete: false,
    evidence: [
      state("skill.drawing.creative.pixel_synthesis", 1, .82), state("skill.drawing.creative.sprite_motion", 1, .74),
      state("skill.drawing.creative.pattern_continuity", 0, null, null), state("skill.drawing.creative.animation_timing", 0, null, null),
    ],
  }, {
    completedMissionIds: ["manga"],
    evidence: [state("skill.drawing.creative.manga_head_construction", 1, .88), state("skill.drawing.creative.isometric_construction", 0, null, null)],
  });
  const synthesis = territories.find((territory) => territory.key === "synthesis")!;
  const narrative = territories.find((territory) => territory.key === "narrative")!;
  const structure = territories.find((territory) => territory.key === "structure")!;
  assert.equal(synthesis.complete, false);
  assert.equal(synthesis.completedSteps, 2);
  assert.equal(synthesis.totalSteps, 4);
  assert.equal(synthesis.evidenceCount, 2);
  assert.equal(Math.round((synthesis.masteryScore ?? 0) * 100), 78);
  assert.equal(narrative.complete, true);
  assert.equal(narrative.reward, "Sigilo das Vistas");
  assert.equal(structure.complete, false);
  assert.equal(structure.evidenceCount, 0);
});

test("world summary counts creative territories without inventing progress", () => {
  const territories = deriveCreativeTerritories({ completedMissionIds: [], completedCount: 0, complete: false, evidence: [] }, { completedMissionIds: [], evidence: [] });
  const summary = creativeWorldSummary(territories);
  assert.deepEqual({ completed: summary.completed, total: summary.total, evidenceCount: summary.evidenceCount, complete: summary.complete }, { completed: 0, total: 3, evidenceCount: 0, complete: false });
  assert.equal(summary.averageMastery, null);
});

test("Atlas recommendation follows an active creative thread before returning to Foundation", () => {
  const territories = deriveCreativeTerritories({ completedMissionIds: ["pixel"], completedCount: 1, complete: false, evidence: [state("skill.drawing.creative.pixel_synthesis", 1, .8)] }, { completedMissionIds: [], evidence: [] });
  const recommendation = nextAtlasMission(false, { title: "Continue a Foundation", description: "C0–C4", href: "/learn" }, territories);
  assert.equal(recommendation.kind, "creative");
  assert.equal(recommendation.href, "/create/pixel/quest");
});

test("Atlas continues the territory actually started instead of the first incomplete territory", () => {
  const territories = deriveCreativeTerritories({ completedMissionIds: [], completedCount: 0, complete: false, evidence: [] }, { completedMissionIds: [], evidence: [state("skill.drawing.creative.manga_head_construction", 1, .72)] });
  const recommendation = nextAtlasMission(true, { title: "Foundation", description: "done", href: "/learn" }, territories);
  assert.equal(recommendation.kind, "creative");
  assert.equal(recommendation.href, "/create/manga");
  assert.match(recommendation.description, /Continue o território criativo/);
});

test("Atlas opens Câmara da Obra only after Foundation and all creative territories are complete", () => {
  const territories = deriveCreativeTerritories({
    completedMissionIds: ["pixel", "sprite", "tile", "animation"], completedCount: 4, complete: true,
    evidence: [
      state("skill.drawing.creative.pixel_synthesis", 1, .8), state("skill.drawing.creative.sprite_motion", 1, .8),
      state("skill.drawing.creative.pattern_continuity", 1, .8), state("skill.drawing.creative.animation_timing", 1, .8),
    ],
  }, {
    completedMissionIds: ["manga", "isometric"],
    evidence: [state("skill.drawing.creative.manga_head_construction", 1, .8), state("skill.drawing.creative.isometric_construction", 1, .8)],
  });
  const recommendation = nextAtlasMission(true, { title: "Foundation", description: "done", href: "/learn" }, territories);
  assert.equal(recommendation.kind, "capstone");
  assert.equal(recommendation.href, "/create/work");
});
