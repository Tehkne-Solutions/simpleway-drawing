import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const png1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZxkAAAAASUVORK5CYII=", "base64");
const png2 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z8BQDwAFgwJ/l2GfWQAAAABJRU5ErkJggg==", "base64");

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

async function createSession() {
  const response = await fetch(`${baseUrl}/api/session/guest`, { method: "POST" });
  await assertHttp(response, 201, "atlas guest session");
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie);
  return setCookie.split(";", 1)[0];
}

async function uploadPrivate(cookie, body) {
  const prepare = await fetch(`${baseUrl}/api/files/private-upload`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ mimeType: "image/png", byteSize: body.byteLength }),
  });
  await assertHttp(prepare, 201, "atlas prepare upload");
  const intent = await prepare.json();
  const upload = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/png", "content-length": String(body.byteLength) },
    body,
  });
  await assertHttp(upload, 200, "atlas put object");
  const confirm = await fetch(`${baseUrl}/api/files/confirm`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId: intent.fileAssetId }),
  });
  await assertHttp(confirm, 200, "atlas confirm upload");
  return intent.fileAssetId;
}

const cookie = await createSession();
const firstFile = await uploadPrivate(cookie, png1);
const create = await fetch(`${baseUrl}/api/artworks`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({
    fileAssetId: firstFile,
    title: "Atlas Same-Origin E2E",
    type: "ARTWORK",
    source: "CANVAS",
    notes: "Primeira passagem Atlas.",
  }),
});
await assertHttp(create, 201, "atlas create artwork v1");
const artwork = (await create.json()).artwork;

const secondFile = await uploadPrivate(cookie, png2);
const addV2 = await fetch(`${baseUrl}/api/artworks/${artwork.id}/versions`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: secondFile, source: "CANVAS", notes: "Segunda passagem Atlas." }),
});
await assertHttp(addV2, 201, "atlas create artwork v2");

const v1Path = `/api/artworks/${artwork.id}/versions/1/image`;
const v2Path = `/api/artworks/${artwork.id}/versions/2/image`;
const journey = await fetch(`${baseUrl}/journey`, { headers: { cookie }, cache: "no-store" });
await assertHttp(journey, 200, "Atlas Journey page");
const html = await journey.text();
assert.match(html, /Atlas Same-Origin E2E/);
assert.match(html, /VISUAL V1/);
assert.match(html, /VISUAL V2/);
assert.match(html, new RegExp(v1Path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(html, new RegExp(v2Path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.doesNotMatch(html, /X-Amz-|X-Goog-|localhost:9000|127\.0\.0\.1:9000/i);

const v1 = await fetch(`${baseUrl}${v1Path}`, { headers: { cookie }, cache: "no-store" });
await assertHttp(v1, 200, "Atlas exact v1 image");
assert.deepEqual(Buffer.from(await v1.arrayBuffer()), png1);
const v2 = await fetch(`${baseUrl}${v2Path}`, { headers: { cookie }, cache: "no-store" });
await assertHttp(v2, 200, "Atlas exact v2 image");
assert.deepEqual(Buffer.from(await v2.arrayBuffer()), png2);

console.log("ATLAS_SAME_ORIGIN_E2E=PASS exact_historical_urls no_storage_signature owner_session_reads exact_v1_v2_bytes");
