import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const png1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZxkAAAAASUVORK5CYII=", "base64");
const png2 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z8BQDwAFgwJ/l2GfWQAAAABJRU5ErkJggg==", "base64");

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

async function createSession() {
  const response = await fetch(`${baseUrl}/api/session/guest`, { method: "POST" });
  await assertHttp(response, 201, "on-demand guest session");
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
  await assertHttp(prepare, 201, "on-demand prepare upload");
  const intent = await prepare.json();
  const upload = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/png", "content-length": String(body.byteLength) },
    body,
  });
  await assertHttp(upload, 200, "on-demand put object");
  const confirm = await fetch(`${baseUrl}/api/files/confirm`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId: intent.fileAssetId }),
  });
  await assertHttp(confirm, 200, "on-demand confirm upload");
  return intent.fileAssetId;
}

async function assertOwnedImage(url, cookie, expectedBody, label) {
  const response = await fetch(url, { headers: { cookie }, cache: "no-store" });
  await assertHttp(response, 200, label);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("content-length"), String(expectedBody.byteLength));
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const actual = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(actual, expectedBody);
}

const ownerCookie = await createSession();
const firstFile = await uploadPrivate(ownerCookie, png1);
const create = await fetch(`${baseUrl}/api/artworks`, {
  method: "POST",
  headers: { cookie: ownerCookie, "content-type": "application/json" },
  body: JSON.stringify({
    fileAssetId: firstFile,
    title: "Arquivo Sob Demanda E2E",
    type: "ARTWORK",
    source: "CANVAS",
    notes: "Versão inicial para prova sob demanda.",
  }),
});
await assertHttp(create, 201, "on-demand create artwork v1");
const artwork = (await create.json()).artwork;

const secondFile = await uploadPrivate(ownerCookie, png2);
const addV2 = await fetch(`${baseUrl}/api/artworks/${artwork.id}/versions`, {
  method: "POST",
  headers: { cookie: ownerCookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: secondFile, source: "CANVAS", notes: "Segunda versão para prova sob demanda." }),
});
await assertHttp(addV2, 201, "on-demand create artwork v2");

const v1Path = `/api/artworks/${artwork.id}/versions/1/image`;
const v2Path = `/api/artworks/${artwork.id}/versions/2/image`;

const detailApi = await fetch(`${baseUrl}/api/artworks/${artwork.id}`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(detailApi, 200, "on-demand artwork detail API");
assert.equal(detailApi.headers.get("cache-control"), "no-store, private");
const detailPayload = await detailApi.json();
assert.deepEqual(detailPayload.versions.map((version) => version.readUrl), [v2Path, v1Path]);
assert.doesNotMatch(JSON.stringify(detailPayload), /X-Amz-|X-Goog-|localhost:9000|127\.0\.0\.1:9000/i);

const page = await fetch(`${baseUrl}/create/${artwork.id}`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(page, 200, "on-demand artwork detail page");
const html = await page.text();
assert.match(html, new RegExp(v1Path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(html, new RegExp(v2Path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.doesNotMatch(html, /X-Amz-/i);
assert.doesNotMatch(html, /X-Goog-/i);
assert.doesNotMatch(html, /localhost:9000|127\.0\.0\.1:9000/);

await assertOwnedImage(`${baseUrl}${v1Path}`, ownerCookie, png1, "on-demand exact v1 bytes");
await assertOwnedImage(`${baseUrl}${v2Path}`, ownerCookie, png2, "on-demand exact v2 bytes");

const invalid = await fetch(`${baseUrl}/api/artworks/${artwork.id}/versions/not-a-number/image`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(invalid, 404, "on-demand malformed version rejected");
assert.equal((await invalid.json()).code, "ARTWORK_VERSION_NOT_FOUND");

const missing = await fetch(`${baseUrl}/api/artworks/${artwork.id}/versions/999/image`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(missing, 404, "on-demand missing version rejected");
assert.equal((await missing.json()).code, "ARTWORK_VERSION_NOT_FOUND");

const unauthenticated = await fetch(`${baseUrl}${v1Path}`, { cache: "no-store" });
await assertHttp(unauthenticated, 401, "on-demand unauthenticated rejected");
assert.equal((await unauthenticated.json()).code, "UNAUTHENTICATED");

const outsiderCookie = await createSession();
const outsider = await fetch(`${baseUrl}${v1Path}`, { headers: { cookie: outsiderCookie }, cache: "no-store" });
await assertHttp(outsider, 404, "on-demand outsider rejected");
assert.equal((await outsider.json()).code, "ARTWORK_VERSION_NOT_FOUND");

console.log("ON_DEMAND_VERSION_IMAGES_E2E=PASS same_origin_detail_api same_origin_html exact_version_bytes owner_scoped storage_on_request private_no_store nosniff invalid_version_404 missing_version_404 unauthenticated_401 outsider_404");
