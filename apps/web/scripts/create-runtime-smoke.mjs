import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const png1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZxkAAAAASUVORK5CYII=", "base64");
const png2 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z8BQDwAFgwJ/l2GfWQAAAABJRU5ErkJggg==", "base64");

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

async function createSession() {
  const response = await fetch(`${baseUrl}/api/session/guest`, { method: "POST" });
  await assertHttp(response, 201, "guest session");
  const payload = await response.json();
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie);
  return { userId: payload.userId, cookie: setCookie.split(";", 1)[0] };
}

async function uploadPrivate(cookie, body) {
  const prepare = await fetch(`${baseUrl}/api/files/private-upload`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ mimeType: "image/png", byteSize: body.byteLength }),
  });
  await assertHttp(prepare, 201, "prepare artwork upload");
  const intent = await prepare.json();
  const put = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/png", "content-length": String(body.byteLength) },
    body,
  });
  await assertHttp(put, 200, "put artwork object");
  const confirm = await fetch(`${baseUrl}/api/files/confirm`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId: intent.fileAssetId }),
  });
  await assertHttp(confirm, 200, "confirm artwork upload");
  assert.equal((await confirm.json()).ready, true);
  return intent;
}

const owner = await createSession();
const firstUpload = await uploadPrivate(owner.cookie, png1);
assert.match(firstUpload.storageKey, new RegExp(`^private/${owner.userId}/artwork/`));

const crossOriginCreate = await fetch(`${baseUrl}/api/artworks`, {
  method: "POST",
  headers: { cookie: owner.cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify({ fileAssetId: firstUpload.fileAssetId, title: "Estudo E2E", type: "STUDY", source: "UPLOAD" }),
});
assert.equal(crossOriginCreate.status, 403);
assert.equal((await crossOriginCreate.json()).code, "CROSS_ORIGIN_REQUEST_BLOCKED");

const create = await fetch(`${baseUrl}/api/artworks`, {
  method: "POST",
  headers: { cookie: owner.cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: firstUpload.fileAssetId, title: "Estudo E2E", type: "STUDY", source: "UPLOAD", notes: "Primeira versão E2E" }),
});
await assertHttp(create, 201, "create artwork");
const created = (await create.json()).artwork;
assert.match(created.id, /^[0-9a-f-]{36}$/i);
assert.equal(created.title, "Estudo E2E");
assert.equal(created.versionNumber, 1);
assert.equal(created.visibility, "PRIVATE");

const list = await fetch(`${baseUrl}/api/artworks`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(list, 200, "list owned artworks");
const listed = (await list.json()).artworks.find((item) => item.id === created.id);
assert.ok(listed);
assert.equal(listed.visibility, "PRIVATE");

const detailV1 = await fetch(`${baseUrl}/create/${created.id}`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(detailV1, 200, "artwork detail v1");
const detailV1Html = await detailV1.text();
assert.match(detailV1Html, /Estudo E2E/);
assert.match(detailV1Html, /v1/);
const srcMatch = detailV1Html.match(/src="(http:\/\/127\.0\.0\.1:9000[^\"]+)"/);
assert.ok(srcMatch?.[1], "private signed image URL must be rendered");
const privateReadUrl = srcMatch[1].replaceAll("&amp;", "&");
const privateRead = await fetch(privateReadUrl);
await assertHttp(privateRead, 200, "private signed artwork read");
assert.deepEqual(Buffer.from(await privateRead.arrayBuffer()), png1);

const outsider = await createSession();
const outsiderDetail = await fetch(`${baseUrl}/create/${created.id}`, { headers: { cookie: outsider.cookie }, redirect: "manual" });
assert.equal(outsiderDetail.status, 404);

const secondUpload = await uploadPrivate(owner.cookie, png2);
const crossOriginVersion = await fetch(`${baseUrl}/api/artworks/${created.id}/versions`, {
  method: "POST",
  headers: { cookie: owner.cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify({ fileAssetId: secondUpload.fileAssetId, source: "UPLOAD", notes: "Segunda versão E2E" }),
});
assert.equal(crossOriginVersion.status, 403);

const addVersion = await fetch(`${baseUrl}/api/artworks/${created.id}/versions`, {
  method: "POST",
  headers: { cookie: owner.cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: secondUpload.fileAssetId, source: "UPLOAD", notes: "Segunda versão E2E" }),
});
await assertHttp(addVersion, 201, "add artwork version");
const version = (await addVersion.json()).version;
assert.equal(version.versionNumber, 2);

const detailV2 = await fetch(`${baseUrl}/create/${created.id}`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(detailV2, 200, "artwork detail v2");
const detailV2Html = await detailV2.text();
assert.match(detailV2Html, /2 versão\(ões\) preservada\(s\)/);
assert.match(detailV2Html, /v2/);
assert.match(detailV2Html, /v1/);
assert.match(detailV2Html, /Segunda versão E2E/);
assert.match(detailV2Html, /Primeira versão E2E/);

const journey = await fetch(`${baseUrl}/journey`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(journey, 200, "Create Journey projection");
const journeyHtml = await journey.text();
assert.match(journeyHtml, /Nova criação registrada/);
assert.match(journeyHtml, /Versão 2 registrada/);

console.log("CREATE_RUNTIME_E2E=PASS private_upload create_csrf artwork_create private_listing signed_private_read ownership_isolation version_csrf immutable_version_history journey_projection");
