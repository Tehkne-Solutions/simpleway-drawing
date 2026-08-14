import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Player Continuity composes Activation and authoritative creative Evidence without a parallel progress store", () => {
  const continuity = source("server/player-continuity.ts");
  const game = source("game/player-continuity.ts");
  assert.match(continuity, /getActivationRepository/);
  assert.match(continuity, /getPixelExpeditionRepository/);
  assert.match(continuity, /getStudioEvidenceRepository/);
  assert.match(continuity, /deriveCreativeTerritories/);
  assert.match(continuity, /derivePlayerContinuity/);
  assert.doesNotMatch(continuity, /insert\(|update\(|delete\(/);
  assert.match(game, /stage === "COMPLETE"/);
  assert.match(game, /nextAtlasMission/);
  assert.match(game, /CREATIVE_WORLD/);
  assert.match(game, /AUTHORING/);
});

test("Home and Resume share the same continuity source instead of diverging after Alpha", () => {
  const home = source("app/page.tsx");
  const resume = source("app/resume/page.tsx");
  assert.match(home, /getPlayerContinuity/);
  assert.match(home, /Territórios ativos/);
  assert.match(home, /territoryState/);
  assert.doesNotMatch(home, /getActivationRepository/);
  assert.match(resume, /getPlayerContinuity/);
  assert.match(resume, /Bússola de Continuidade/);
  assert.match(resume, /continuity\.territories\.map/);
  assert.match(resume, /Selos de ativação/);
  assert.doesNotMatch(resume, /resume-steps/);
});

test("Atlas recommendation continues an authored creative thread rather than a catalog order", () => {
  const atlas = source("game/atlas-world.ts");
  assert.match(atlas, /activeCreative = territories\.find/);
  assert.match(atlas, /territory\.evidenceCount > 0/);
  assert.match(atlas, /Continue o território criativo/);
});
