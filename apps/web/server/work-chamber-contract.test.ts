import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Work Chamber is a real internal authoring workspace", () => {
  const page = source("app/create/work/page.tsx");
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  const css = source("app/create/work/work-chamber-v19.css");
  assert.match(page, /Câmara da Obra · Atelier Autoral/);
  assert.match(page, /WorkChamberCanvas/);
  assert.match(canvas, /type Layer = "construction" \| "ink"/);
  assert.match(canvas, /type Tool = "brush" \| "eraser"/);
  assert.match(canvas, /undo/);
  assert.match(canvas, /redo/);
  assert.match(canvas, /FORMAT_SIZE/);
  assert.match(canvas, /PALETTE/);
  assert.match(css, /work-chamber-shell/);
  assert.match(css, /grid-template-columns:230px minmax\(0,1fr\) 270px/);
});

test("Work Chamber draft is local-first and cannot overwrite storage before hydration", () => {
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  assert.match(canvas, /STORAGE_KEY = "swd\.create\.work-chamber\.v1"/);
  assert.match(canvas, /window\.localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(canvas, /setHydrated\(true\)/);
  assert.match(canvas, /if \(!hydrated\) return/);
  assert.match(canvas, /window\.localStorage\.setItem\(STORAGE_KEY/);
  assert.match(canvas, /window\.localStorage\.removeItem\(STORAGE_KEY\)/);
});

test("guides are viewport-only and blank artwork materialization fails closed", () => {
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  assert.match(canvas, /const drawGuide = useCallback/);
  assert.match(canvas, /drawGuide\(canvas\)/);
  assert.match(canvas, /const exportCanvas = document\.createElement\("canvas"\)/);
  assert.match(canvas, /renderArtwork\(exportCanvas, strokesRef\.current\)/);
  assert.doesNotMatch(canvas, /drawGuide\(exportCanvas\)/);
  assert.match(canvas, /canvasHasVisibleMark\(exportCanvas, background\)/);
  assert.match(canvas, /Torne visível ao menos uma camada com marca/);
});

test("Work Chamber materializes through the existing private CANVAS artwork pipeline", () => {
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  const artworkApi = source("app/api/artworks/route.ts");
  const repository = source("../../packages/database/src/repositories/artworks.ts");
  assert.match(canvas, /canvas\.toBlob/);
  assert.match(canvas, /\/api\/files\/private-upload/);
  assert.match(canvas, /\/api\/files\/confirm/);
  assert.match(canvas, /\/api\/artworks/);
  assert.match(canvas, /type: "ARTWORK"/);
  assert.match(canvas, /source: "CANVAS"/);
  assert.match(artworkApi, /"CANVAS"/);
  assert.match(repository, /CreateArtworkSource = "PHOTO" \| "UPLOAD" \| "CANVAS"/);
  assert.match(repository, /skill\.drawing\.meta\.creation_practice/);
});

test("authoring continuity routes to Work Chamber across Atlas, Create and shell", () => {
  const atlas = source("game/atlas-world.ts");
  const create = source("app/create/page.tsx");
  const shell = source("app/app-shell.tsx");
  assert.match(atlas, /href: "\/create\/work"/);
  assert.match(create, /continuity\?\.phase === "AUTHORING"/);
  assert.match(create, /Entrar na Câmara da Obra/);
  assert.match(create, /href="\/create\/work"/);
  assert.match(shell, /authoringWorkspace = pathname\.startsWith\("\/create\/work"\)/);
  assert.match(shell, /\|\| authoringWorkspace/);
});
