import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Pixel Evidence Bridge validates artifacts, persists mastery and projects into Atlas", () => {
  const validator = source("server/pixel-expedition-evidence.ts");
  const route = source("app/api/pixel/expedition/route.ts");
  const board = source("app/create/pixel/quest/pixel-quest-board.tsx");
  const runtime = source("server/runtime.ts");
  const skills = source("app/skills/page.tsx");
  const journey = source("app/journey/page.tsx");
  const content = source("../../content/drawing/skills/meta.yaml");
  const databaseIndex = source("../../packages/database/src/index.ts");
  const repository = source("../../packages/database/src/repositories/pixel-expedition.ts");

  assert.match(content, /skill\.drawing\.creative\.pixel_synthesis/);
  assert.match(content, /skill\.drawing\.creative\.sprite_motion/);
  assert.match(content, /skill\.drawing\.creative\.pattern_continuity/);
  assert.match(content, /skill\.drawing\.creative\.animation_timing/);

  assert.match(validator, /validatePixelMissionSubmission/);
  assert.match(validator, /PIXEL_MISSION_CRITERIA_NOT_MET/);
  assert.match(validator, /SPRITE_ONION_REQUIRED/);
  assert.match(validator, /TILE_PREVIEW_REQUIRED/);
  assert.match(validator, /ANIMATION_PLAYBACK_REQUIRED/);
  assert.doesNotMatch(validator, /complete\s*===\s*true/);

  assert.match(route, /readJsonBody<unknown>\(request, 300_000\)/);
  assert.match(route, /validatePixelMissionSubmission\(body\)/);
  assert.match(route, /getPixelExpeditionRepository\(\)\.recordMission/);
  assert.match(runtime, /getPixelExpeditionRepository/);
  assert.match(databaseIndex, /repositories\/pixel-expedition/);

  assert.match(repository, /exerciseAttempts/);
  assert.match(repository, /skillEvidence/);
  assert.match(repository, /learnerSkillStates/);
  assert.match(repository, /journeyEntries/);
  assert.match(repository, /outboxEvents/);
  assert.match(repository, /STUDIO_MISSION_COMPLETED/);
  assert.match(repository, /PIXEL_EXPEDITION_COMPLETED/);
  assert.match(repository, /pg_advisory_xact_lock/);
  assert.match(repository, /hashtextextended/);
  assert.match(repository, /eq\(exerciseAttempts\.exerciseKey, expected\.exerciseKey\)/);

  assert.match(board, /\/api\/session\/guest/);
  assert.match(board, /\/api\/pixel\/expedition/);
  assert.match(board, /JSON\.stringify\(submission\)/);
  assert.match(board, /mergeProgress\(localProgress, serverProgress\)/);
  assert.match(board, /Evidence sincronizada com o Atlas/);
  assert.match(board, /Ver Evidence no Atlas/);

  assert.match(skills, /Síntese em Pixel Art/);
  assert.match(skills, /Movimento por poses/);
  assert.match(skills, /Continuidade de padrões/);
  assert.match(skills, /Timing de animação/);
  assert.match(journey, /from\(journeyEntries\)/);
});
