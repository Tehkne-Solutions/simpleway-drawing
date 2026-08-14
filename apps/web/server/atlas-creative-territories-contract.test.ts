import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Atlas projects authoritative creative Evidence as world territories", () => {
  const page = source("app/journey/page.tsx");
  const world = source("game/atlas-world.ts");
  const css = source("app/journey/atlas-creative-v15.css");

  assert.match(page, /getPixelExpeditionRepository\(\)\.getSnapshot/);
  assert.match(page, /getStudioEvidenceRepository\(\)\.getSnapshot/);
  assert.match(page, /deriveCreativeTerritories/);
  assert.match(page, /derivePlayerRank\(worldDomains\)/);
  assert.match(page, /SANTUÁRIO CRIATIVO/);
  assert.match(page, /Relicário dos Ateliers/);
  assert.match(page, /CÂMARA DA OBRA/);
  assert.match(page, /Sigilos que existem porque você demonstrou habilidade/);

  assert.match(world, /Santuário da Síntese/);
  assert.match(world, /Arquivo das Vistas/);
  assert.match(world, /Prisma dos Três Eixos/);
  assert.match(world, /pixel\.complete/);
  assert.match(world, /studio\.completedMissionIds\.includes\("manga"\)/);
  assert.match(world, /studio\.completedMissionIds\.includes\("isometric"\)/);
  assert.doesNotMatch(world, /localStorage/);

  assert.match(css, /atlas-creative-sanctum/);
  assert.match(css, /atlas-reliquary/);
  assert.match(css, /atlas-relic-capstone/);
});
