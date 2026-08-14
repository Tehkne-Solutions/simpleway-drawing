import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Manga and Isometric studios use process-based authoritative Evidence", () => {
  const manga = source("app/create/manga/manga-canvas.tsx");
  const isometric = source("app/create/isometric/isometric-canvas.tsx");
  const validator = source("server/studio-evidence.ts");
  const route = source("app/api/studio/evidence/route.ts");
  const runtime = source("server/runtime.ts");
  const repository = source("../../packages/database/src/repositories/studio-evidence.ts");
  const databaseIndex = source("../../packages/database/src/index.ts");
  const skills = source("app/skills/page.tsx");
  const content = source("../../content/drawing/skills/meta.yaml");

  assert.match(manga, /swd\.create\.manga\.v2/);
  assert.match(manga, /strokesByView/);
  assert.match(manga, /guideUsageByView/);
  assert.match(manga, /front: \[\], "three-quarter": \[\], profile: \[\]/);
  assert.match(manga, /Registrar Evidence no Atlas/);
  assert.doesNotMatch(manga, /done: guides\.skull/);

  assert.match(isometric, /classifyAxis/);
  assert.match(isometric, /axis30/);
  assert.match(isometric, /vertical/);
  assert.match(isometric, /axis150/);
  assert.match(isometric, /snapped: tool === "segment" && snap/);
  assert.match(isometric, /metrics\.axis30 >= 3/);
  assert.match(isometric, /metrics\.vertical >= 3/);
  assert.match(isometric, /metrics\.axis150 >= 3/);
  assert.match(isometric, /Registrar Evidence no Atlas/);

  assert.match(validator, /MANGA_VIEW_CRITERIA_NOT_MET/);
  assert.match(validator, /ISOMETRIC_AXES_CRITERIA_NOT_MET/);
  assert.match(validator, /classifyIsometricAxis/);
  assert.doesNotMatch(validator, /complete\s*===\s*true/);

  assert.match(route, /validateStudioEvidenceSubmission/);
  assert.match(route, /getStudioEvidenceRepository\(\)\.recordMission/);
  assert.match(runtime, /getStudioEvidenceRepository/);
  assert.match(databaseIndex, /repositories\/studio-evidence/);

  assert.match(repository, /CREATIVE_PROCESS/);
  assert.match(repository, /STUDIO_MISSION_COMPLETED/);
  assert.match(repository, /studio\.mission\.completed\.v1/);
  assert.match(repository, /pg_advisory_xact_lock/);
  assert.match(repository, /hashtextextended/);

  assert.match(content, /skill\.drawing\.creative\.manga_head_construction/);
  assert.match(content, /skill\.drawing\.creative\.isometric_construction/);
  assert.match(skills, /Construção de cabeça em múltiplas vistas/);
  assert.match(skills, /Construção isométrica em três eixos/);
});
