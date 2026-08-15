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

test("version image route validates an exact owned version before reading private storage", () => {
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

test("read boundary uses the same exact artwork image MIME allowlist as upload and rejects broader image wildcards", () => {
  const route = source("app/api/artworks/[artworkId]/versions/[versionNumber]/image/route.ts");
  const upload = source("app/api/files/private-upload/route.ts");
  for (const mime of ["image/jpeg", "image/png", "image/webp"]) {
    assert.match(route, new RegExp(mime.replace("/", "\\/")));
    assert.match(upload, new RegExp(mime.replace("/", "\\/")));
  }
  assert.match(route, /supportedImageMimeTypes\.has\(row\.mimeType\)/);
  assert.match(route, /ARTWORK_IMAGE_NOT_AVAILABLE/);
  assert.match(route, /status: 415/);
  assert.doesNotMatch(route, /startsWith\(["']image\//);
  const mimeGuard = route.indexOf("supportedImageMimeTypes.has(row.mimeType)");
  const storageRead = route.indexOf("getStorage().readPrivateFile(row.storageKey)");
  assert.ok(mimeGuard >= 0 && storageRead > mimeGuard, "persisted MIME must be accepted before any storage read");
});

test("storage ContentType must match persisted MIME before any private bytes are returned", () => {
  const route = source("app/api/artworks/[artworkId]/versions/[versionNumber]/image/route.ts");
  const storageRead = route.indexOf("getStorage().readPrivateFile(row.storageKey)");
  const metadataGuard = route.indexOf('if (file.mimeType !== row.mimeType) throw new Error("ARTWORK_IMAGE_METADATA_MISMATCH")');
  const bodyCopy = route.indexOf("const body = new ArrayBuffer(file.body.byteLength)");
  assert.ok(storageRead >= 0 && metadataGuard > storageRead && bodyCopy > metadataGuard, "storage MIME mismatch must fail closed before copying response bytes");
  assert.match(route, /ARTWORK_IMAGE_METADATA_MISMATCH/);
  assert.doesNotMatch(route, /ARTWORK_IMAGE_METADATA_MISMATCH[\s\S]*NextResponse\.json\(\{ code: "ARTWORK_IMAGE_METADATA_MISMATCH"/);
});

test("version image route returns copied adapter bytes without browser persistence and with nosniff", () => {
  const route = source("app/api/artworks/[artworkId]/versions/[versionNumber]/image/route.ts");
  assert.match(route, /const file = await getStorage\(\)\.readPrivateFile\(row\.storageKey\)/);
  assert.match(route, /const body = new ArrayBuffer\(file\.body\.byteLength\)/);
  assert.match(route, /new Uint8Array\(body\)\.set\(file\.body\)/);
  assert.match(route, /new Response\(body/);
  assert.match(route, /"content-type": row\.mimeType/);
  assert.match(route, /"content-length": String\(file\.byteSize\)/);
  assert.match(route, /"cache-control": "private, no-store"/);
  assert.match(route, /"x-content-type-options": "nosniff"/);
  assert.doesNotMatch(route, /max-age=/);
  assert.doesNotMatch(route, /immutable/);
});

test("unauthenticated, invalid, unsupported and missing versions fail closed without cacheable error responses", () => {
  const route = source("app/api/artworks/[artworkId]/versions/[versionNumber]/image/route.ts");
  assert.match(route, /if \(!userId\).*UNAUTHENTICATED[\s\S]*status: 401[\s\S]*"cache-control": "no-store"/);
  assert.match(route, /ARTWORK_VERSION_NOT_FOUND[\s\S]*status: 404[\s\S]*"cache-control": "no-store"/);
  assert.match(route, /ARTWORK_IMAGE_NOT_AVAILABLE[\s\S]*status: 415[\s\S]*"cache-control": "no-store"/);
  assert.match(route, /ARTWORK_VERSION_IMAGE_FAILED[\s\S]*status: 500[\s\S]*"cache-control": "no-store"/);
});
