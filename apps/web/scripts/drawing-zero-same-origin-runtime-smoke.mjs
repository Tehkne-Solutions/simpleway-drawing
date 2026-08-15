import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const png1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZxkAAAAASUVORK5CYII=", "base64");
const png2 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z8BQDwAFgwJ/l2GfWQAAAABJRU5ErkJggg==", "base64");

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

async function createSession() {
  const response = await fetch(`${baseUrl}/api/session/guest`, { method: "POST" });
  await assertHttp(response, 201, "drawing-zero guest session");
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
  await assertHttp(prepare, 201, "drawing-zero prepare upload");
  const intent = await prepare.json();
  const upload = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/png", "content-length": String(body.byteLength) },
    body,
  });
  await assertHttp(upload, 200, "drawing-zero put object");
  const confirm = await fetch(`${baseUrl}/api/files/confirm`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId: intent.fileAssetId }),
  });
  await assertHttp(confirm, 200, "drawing-zero confirm upload");
  return intent.fileAssetId;
}

const cookie = await createSession();
const baselineFile = await uploadPrivate(cookie, png1);
const baselineResponse = await fetch(`${baseUrl}/api/drawing-zero`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: baselineFile, source: "UPLOAD" }),
});
await assertHttp(baselineResponse, 201, "create Drawing Zero baseline");
const baseline = await baselineResponse.json();
assert.match(baseline.artworkId, /^[0-9a-f-]{36}$/i);

const revisitFile = await uploadPrivate(cookie, png2);
const revisitResponse = await fetch(`${baseUrl}/api/artworks`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({
    fileAssetId: revisitFile,
    title: "Drawing Zero revisited",
    type: "ARTWORK",
    source: "CANVAS",
    notes: "Revisita para comparação antes/depois.",
  }),
});
await assertHttp(revisitResponse, 201, "create Drawing Zero revisit");
const revisit = (await revisitResponse.json()).artwork;

const baselinePath = `/api/artworks/${baseline.artworkId}/versions/1/image`;
const revisitPath = `/api/artworks/${revisit.id}/versions/1/image`;
const journey = await fetch(`${baseUrl}/journey`, { headers: { cookie }, cache: "no-store" });
await assertHttp(journey, 200, "Drawing Zero Journey comparison");
const html = await journey.text();
assert.match(html, /ANTES \/ DEPOIS/);
assert.match(html, new RegExp(baselinePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(html, new RegExp(revisitPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.doesNotMatch(html, /X-Amz-|X-Goog-|localhost:9000|127\.0\.0\.1:9000/i);

const baselineImage = await fetch(`${baseUrl}${baselinePath}`, { headers: { cookie }, cache: "no-store" });
await assertHttp(baselineImage, 200, "Drawing Zero baseline image");
assert.deepEqual(Buffer.from(await baselineImage.arrayBuffer()), png1);
const revisitImage = await fetch(`${baseUrl}${revisitPath}`, { headers: { cookie }, cache: "no-store" });
await assertHttp(revisitImage, 200, "Drawing Zero revisit image");
assert.deepEqual(Buffer.from(await revisitImage.arrayBuffer()), png2);

console.log("DRAWING_ZERO_SAME_ORIGIN_E2E=PASS before_after exact_current_versions no_storage_signature owner_session_reads exact_bytes");
