import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("artwork detail builds deterministic same-origin version image URLs without signing every version during SSR", () => {
  const page = source("app/create/[artworkId]/page.tsx");
  assert.doesNotMatch(page, /getStorage/);
  assert.doesNotMatch(page, /createPrivateReadUrl/);
  assert.doesNotMatch(page, /Promise\.all\(record\.versions/);
  assert.match(page, /readUrl: `\/api\/artworks\/\$\{encodeURIComponent\(record\.artwork\.id\)\}\/versions\/\$\{version\.versionNumber\}\/image`/);
  assert.match(page, /loading=\{index === 0 \? "eager" : "lazy"\}/);
});

test("version image route validates an exact immutable version before reading private storage", () => {
  const route = source("app/api/artworks/[artworkId]/versions/[versionNumber]/image/route.ts");
  assert.match(route, /const parsedVersion = Number\(versionNumber\)/);
  assert.match(route, /!Number\.isInteger\(parsedVersion\) \|\| parsedVersion < 1/);
  assert.match(route, /ARTWORK_VERSION_NOT_FOUND/);
  assert.match(route, /eq\(artworkVersions\.artworkId, artworkId\)/);
  assert.match(route, /eq\(artworkVersions\.versionNumber, parsedVersion\)/);
  assert.match(route, /eq\(artworks\.ownerUserId, userId\)/);
  const rowGuard = route.indexOf('if (!row) return NextResponse.json({ code: "ARTWORK_VERSION_NOT_FOUND" }');
  const storageRead = route.indexOf("getStorage().readPrivateFile(row.storageKey)");
  assert.ok(rowGuard >= 0 && storageRead > rowGuard, "storage read must happen only after exact owner-scoped version lookup");
});

test("version image route returns copied bytes with private immutable browser caching and nosniff", () => {
  const route = source("app/api/artworks/[artworkId]/versions/[versionNumber]/image/route.ts");
  assert.match(route, /const body = new Uint8Array\(bytes\.byteLength\)/);
  assert.match(route, /body\.set\(bytes\)/);
  assert.match(route, /new Response\(body\.buffer/);
  assert.match(route, /"content-type": row\.mimeType/);
  assert.match(route, /"content-length": String\(body\.byteLength\)/);
  assert.match(route, /"cache-control": "private, max-age=600, immutable"/);
  assert.match(route, /"x-content-type-options": "nosniff"/);
});

test("unauthenticated, invalid and missing versions fail closed without cacheable error responses", () => {
  const route = source("app/api/artworks/[artworkId]/versions/[versionNumber]/image/route.ts");
  assert.match(route, /if \(!userId\).*UNAUTHENTICATED[\s\S]*status: 401[\s\S]*"cache-control": "no-store"/);
  assert.match(route, /ARTWORK_VERSION_NOT_FOUND[\s\S]*status: 404[\s\S]*"cache-control": "no-store"/);
  assert.match(route, /ARTWORK_VERSION_IMAGE_FAILED[\s\S]*status: 500[\s\S]*"cache-control": "no-store"/);
});
