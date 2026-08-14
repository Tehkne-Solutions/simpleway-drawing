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

test("Work Chamber draft is local-first, scoped per artwork and cannot overwrite storage before hydration", () => {
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  assert.match(canvas, /STORAGE_PREFIX = "swd\.create\.work-chamber\.v2"/);
  assert.match(canvas, /initialArtwork\?\.id \?\? "new"/);
  assert.match(canvas, /window\.localStorage\.getItem\(storageKey\)/);
  assert.match(canvas, /setHydrated\(true\)/);
  assert.match(canvas, /if \(!hydrated\) return/);
  assert.match(canvas, /window\.localStorage\.setItem\(storageKey/);
  assert.match(canvas, /window\.localStorage\.removeItem\(storageKey\)/);
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

test("Work Chamber materializes new works through the existing private CANVAS artwork pipeline", () => {
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  const artworkApi = source("app/api/artworks/route.ts");
  const repository = source("../../packages/database/src/repositories/artworks.ts");
  assert.match(canvas, /canvas\.toBlob/);
  assert.match(canvas, /\/api\/files\/private-upload/);
  assert.match(canvas, /\/api\/files\/confirm/);
  assert.match(canvas, /await fetch\("\/api\/artworks"/);
  assert.match(canvas, /type: "ARTWORK"/);
  assert.match(canvas, /source: "CANVAS"/);
  assert.match(artworkApi, /"CANVAS"/);
  assert.match(repository, /CreateArtworkSource = "PHOTO" \| "UPLOAD" \| "CANVAS"/);
  assert.match(repository, /skill\.drawing\.meta\.creation_practice/);
});

test("existing ARTWORK records reopen through an owner-scoped same-origin raster base", () => {
  const page = source("app/create/work/page.tsx");
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  const imageRoute = source("app/api/artworks/[artworkId]/current-image/route.ts");
  const storage = source("../../packages/storage/src/index.ts");
  const detail = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /searchParams: Promise<\{ artworkId\?: string \}>/);
  assert.match(page, /getArtworkRepository\(\)\.getOwned\(userId, artworkId\)/);
  assert.match(page, /imageSrc: `\/api\/artworks\/\$\{encodeURIComponent\(record\.artwork\.id\)\}\/current-image`/);
  assert.match(canvas, /baseImageRef/);
  assert.match(canvas, /base raster imutável/i);
  assert.match(imageRoute, /getArtworkRepository\(\)\.getOwned\(userId, artworkId\)/);
  assert.match(imageRoute, /readPrivateFile\(current\.storageKey\)/);
  assert.match(storage, /async readPrivateFile\(storageKey: string\)/);
  assert.match(detail, /Continuar na Câmara/);
  assert.match(detail, /\/create\/work\?artworkId=/);
});

test("round-trip saves a visible change as a new CANVAS version of the same artwork", () => {
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  const versionsApi = source("app/api/artworks/[artworkId]/versions/route.ts");
  const repository = source("../../packages/database/src/repositories/artworks.ts");
  assert.match(canvas, /canvasesDiffer\(exportCanvas, baselineCanvas\)/);
  assert.match(canvas, /composição ainda é idêntica à versão anterior/);
  assert.match(canvas, /\/api\/artworks\/\$\{encodeURIComponent\(initialArtwork\.id\)\}\/versions/);
  assert.match(canvas, /source: "CANVAS"/);
  assert.match(canvas, /router\.push\(`\/create\/\$\{artworkId\}`\)/);
  assert.match(versionsApi, /SOURCES = new Set\(\["PHOTO", "UPLOAD", "CANVAS"\]\)/);
  assert.match(repository, /async addVersion/);
  assert.match(repository, /type: "ARTWORK_VERSION"/);
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
