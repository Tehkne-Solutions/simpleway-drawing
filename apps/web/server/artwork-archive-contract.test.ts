import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Atelier library is visual and derives each preview from the current artwork version", () => {
  const archive = source("server/artwork-archive.ts");
  const create = source("app/create/page.tsx");
  const css = source("app/visual-v1-create-journey.css");

  assert.match(archive, /innerJoin\(artworkVersions, eq\(artworkVersions\.id, artworks\.currentVersionId\)\)/);
  assert.match(archive, /versionNumber: artworkVersions\.versionNumber/);
  assert.match(archive, /imageUrl: `\/api\/artworks\/\$\{encodeURIComponent\(row\.id\)\}\/current-image`/);
  assert.match(create, /getArtworkLibrary\(userId\)/);
  assert.match(create, /Arquivo Vivo do Atelier/);
  assert.match(create, /artwork-tile-preview/);
  assert.match(create, /VERSÃO ATUAL · V\{artwork\.versionNumber\}/);
  assert.match(create, /<img src=\{artwork\.imageUrl\}/);
  assert.match(css, /\.artwork-grid-visual/);
  assert.match(css, /\.artwork-version-badge/);
});

test("Journey artwork preview can resolve an exact historical version instead of currentVersionId", () => {
  const archive = source("server/artwork-archive.ts");
  const historicalPreview = archive.slice(archive.indexOf("export async function getJourneyArtworkPreview"));
  assert.match(historicalPreview, /versionNumber: number \| null/);
  assert.match(historicalPreview, /filters\.push\(eq\(artworkVersions\.versionNumber, versionNumber\)\)/);
  assert.match(historicalPreview, /innerJoin\(artworkVersions, eq\(artworkVersions\.artworkId, artworks\.id\)\)/);
  assert.doesNotMatch(historicalPreview, /currentVersionId/);
});

test("Atlas uses journey metadata versionNumber for ARTWORK_CREATED and ARTWORK_VERSION visuals", () => {
  const journey = source("app/journey/page.tsx");
  assert.match(journey, /entry\.type === "ARTWORK_CREATED" \|\| entry\.type === "ARTWORK_VERSION"/);
  assert.match(journey, /typeof metadata\.versionNumber === "number"/);
  assert.match(journey, /getJourneyArtworkPreview\(userId, entry\.artworkId, historicalVersion\)/);
  assert.match(journey, /imageVersionNumber/);
  assert.match(journey, /`VISUAL V\$\{item\.imageVersionNumber\}`/);
  assert.match(journey, /href="\/create\/work" className=\{`atlas-relic atlas-relic-capstone/);
});

test("visual version labels have physical archive styling without gradient or glow", () => {
  const css = source("app/visual-v1-create-journey.css");
  assert.match(css, /\.milestone-preview-wrap/);
  assert.match(css, /\.atlas-archive-image/);
  assert.match(css, /\.milestone-preview-wrap > span, \.atlas-archive-image > small/);
  const archiveRules = css.slice(css.indexOf(".milestone-preview-wrap"));
  assert.doesNotMatch(archiveRules, /linear-gradient|radial-gradient|filter:\s*drop-shadow/);
});
