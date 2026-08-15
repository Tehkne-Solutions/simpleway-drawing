import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Drawing Zero before/after comparison uses exact same-origin current-version images without storage signing", () => {
  const journey = source("app/journey/page.tsx");
  const helper = journey.slice(journey.indexOf("async function artworkPreview"), journey.indexOf("export default async function JourneyPage"));

  assert.doesNotMatch(helper, /fileAssets|storageKey|getStorage|createPrivateReadUrl/);
  assert.match(helper, /versionNumber: artworkVersions\.versionNumber/);
  assert.match(helper, /innerJoin\(artworkVersions, eq\(artworkVersions\.id, artworks\.currentVersionId\)\)/);
  assert.match(helper, /imageUrl: `\/api\/artworks\/\$\{encodeURIComponent\(row\.id\)\}\/versions\/\$\{row\.versionNumber\}\/image`/);
  assert.match(journey, /ANTES \/ DEPOIS/);
  assert.match(journey, /src=\{baseline\.imageUrl\}/);
  assert.match(journey, /src=\{revisit\.imageUrl\}/);
});
