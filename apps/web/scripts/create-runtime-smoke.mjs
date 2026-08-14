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
  const prepare = await fetch(`${baseUrl}/api/files/private-upload`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ mimeType: "image/png", byteSize: body.byteLength }) });
  await assertHttp(prepare, 201, "prepare artwork upload");
  const intent = await prepare.json();
  const put = await fetch(intent.uploadUrl, { method: "PUT", headers: { "content-type": "image/png", "content-length": String(body.byteLength) }, body });
  await assertHttp(put, 200, "put artwork object");
  const confirm = await fetch(`${baseUrl}/api/files/confirm`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ fileAssetId: intent.fileAssetId }) });
  await assertHttp(confirm, 200, "confirm artwork upload");
  assert.equal((await confirm.json()).ready, true);
  return intent;
}

const owner = await createSession();
const firstUpload = await uploadPrivate(owner.cookie, png1);
assert.match(firstUpload.storageKey, new RegExp(`^private/${owner.userId}/artwork/`));

const crossOriginCreate = await fetch(`${baseUrl}/api/artworks`, {
  method: "POST", headers: { cookie: owner.cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify({ fileAssetId: firstUpload.fileAssetId, title: "Estudo E2E", type: "STUDY", source: "UPLOAD" }),
});
assert.equal(crossOriginCreate.status, 403);
assert.equal((await crossOriginCreate.json()).code, "CROSS_ORIGIN_REQUEST_BLOCKED");

const create = await fetch(`${baseUrl}/api/artworks`, {
  method: "POST", headers: { cookie: owner.cookie, "content-type": "application/json" },
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

const detailV1 = await fetch(`${baseUrl}/api/artworks/${created.id}`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(detailV1, 200, "owned artwork detail v1");
const detailV1Payload = await detailV1.json();
assert.equal(detailV1Payload.artwork.title, "Estudo E2E");
assert.equal(detailV1Payload.versions.length, 1);
assert.equal(detailV1Payload.versions[0].versionNumber, 1);
assert.equal(detailV1Payload.versions[0].notes, "Primeira versão E2E");
assert.match(detailV1Payload.versions[0].readUrl, /^http:\/\/127\.0\.0\.1:9000\//);
const privateRead = await fetch(detailV1Payload.versions[0].readUrl);
await assertHttp(privateRead, 200, "private signed artwork read");
assert.deepEqual(Buffer.from(await privateRead.arrayBuffer()), png1);

const ownerPage = await fetch(`${baseUrl}/create/${created.id}`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(ownerPage, 200, "owner artwork page");
assert.match(await ownerPage.text(), /Estudo E2E/);

const chamberPage = await fetch(`${baseUrl}/create/work`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(chamberPage, 200, "Work Chamber page");
const chamberHtml = await chamberPage.text();
assert.match(chamberHtml, /Câmara da Obra/);
assert.match(chamberHtml, /Canvas livre da Câmara da Obra/);

const canvasUpload = await uploadPrivate(owner.cookie, png2);
const canvasCreate = await fetch(`${baseUrl}/api/artworks`, {
  method: "POST", headers: { cookie: owner.cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: canvasUpload.fileAssetId, title: "Câmara E2E", type: "ARTWORK", source: "CANVAS", notes: "Materializada dentro da Câmara da Obra" }),
});
await assertHttp(canvasCreate, 201, "create Work Chamber canvas artwork");
const canvasArtwork = (await canvasCreate.json()).artwork;
assert.equal(canvasArtwork.title, "Câmara E2E");
assert.equal(canvasArtwork.type, "ARTWORK");
assert.equal(canvasArtwork.visibility, "PRIVATE");

const canvasDetailV1 = await fetch(`${baseUrl}/api/artworks/${canvasArtwork.id}`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(canvasDetailV1, 200, "Work Chamber artwork detail v1");
const canvasDetailV1Payload = await canvasDetailV1.json();
assert.equal(canvasDetailV1Payload.versions.length, 1);
assert.equal(canvasDetailV1Payload.versions[0].source, "CANVAS");
assert.equal(canvasDetailV1Payload.versions[0].notes, "Materializada dentro da Câmara da Obra");

const canvasCurrentV1 = await fetch(`${baseUrl}/api/artworks/${canvasArtwork.id}/current-image`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(canvasCurrentV1, 200, "Work Chamber same-origin current image v1");
assert.equal(canvasCurrentV1.headers.get("content-type"), "image/png");
assert.deepEqual(Buffer.from(await canvasCurrentV1.arrayBuffer()), png2);

const canvasOwnerPage = await fetch(`${baseUrl}/create/${canvasArtwork.id}`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(canvasOwnerPage, 200, "Work Chamber artwork page");
const canvasOwnerHtml = await canvasOwnerPage.text();
assert.match(canvasOwnerHtml, /Câmara E2E/);
assert.match(canvasOwnerHtml, /Continuar na Câmara/);
assert.match(canvasOwnerHtml, new RegExp(`/create/work\\?artworkId=${canvasArtwork.id}`));

const reopenChamber = await fetch(`${baseUrl}/create/work?artworkId=${canvasArtwork.id}`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(reopenChamber, 200, "reopen Work Chamber from existing artwork");
const reopenHtml = await reopenChamber.text();
assert.match(reopenHtml, /Continue Câmara E2E/);
assert.match(reopenHtml, /base raster/i);
assert.match(reopenHtml, /Nova versão CANVAS/);

const outsider = await createSession();
const outsiderApi = await fetch(`${baseUrl}/api/artworks/${created.id}`, { headers: { cookie: outsider.cookie }, cache: "no-store" });
assert.equal(outsiderApi.status, 404);
const outsiderDetail = await fetch(`${baseUrl}/create/${created.id}`, { headers: { cookie: outsider.cookie }, redirect: "manual" });
assert.equal(outsiderDetail.status, 200);
assert.match(await outsiderDetail.text(), /Esta etapa não foi encontrada/);
const outsiderCanvasImage = await fetch(`${baseUrl}/api/artworks/${canvasArtwork.id}/current-image`, { headers: { cookie: outsider.cookie }, cache: "no-store" });
assert.equal(outsiderCanvasImage.status, 404);
const outsiderReopen = await fetch(`${baseUrl}/create/work?artworkId=${canvasArtwork.id}`, { headers: { cookie: outsider.cookie }, cache: "no-store" });
assert.equal(outsiderReopen.status, 200);
assert.match(await outsiderReopen.text(), /Esta etapa não foi encontrada/);

const canvasRoundtripUpload = await uploadPrivate(owner.cookie, png1);
const canvasRoundtrip = await fetch(`${baseUrl}/api/artworks/${canvasArtwork.id}/versions`, {
  method: "POST", headers: { cookie: owner.cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: canvasRoundtripUpload.fileAssetId, source: "CANVAS", notes: "Segunda passagem dentro da Câmara" }),
});
await assertHttp(canvasRoundtrip, 201, "add Work Chamber CANVAS round-trip version");
assert.equal((await canvasRoundtrip.json()).version.versionNumber, 2);

const canvasDetailV2 = await fetch(`${baseUrl}/api/artworks/${canvasArtwork.id}`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(canvasDetailV2, 200, "Work Chamber artwork detail v2");
const canvasDetailV2Payload = await canvasDetailV2.json();
assert.equal(canvasDetailV2Payload.artwork.id, canvasArtwork.id);
assert.equal(canvasDetailV2Payload.versions.length, 2);
assert.deepEqual(canvasDetailV2Payload.versions.map((item) => item.versionNumber), [2, 1]);
assert.deepEqual(canvasDetailV2Payload.versions.map((item) => item.source), ["CANVAS", "CANVAS"]);
assert.equal(canvasDetailV2Payload.versions[0].notes, "Segunda passagem dentro da Câmara");
assert.equal(canvasDetailV2Payload.versions[1].notes, "Materializada dentro da Câmara da Obra");
const canvasCurrentV2 = await fetch(`${baseUrl}/api/artworks/${canvasArtwork.id}/current-image`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(canvasCurrentV2, 200, "Work Chamber same-origin current image v2");
assert.deepEqual(Buffer.from(await canvasCurrentV2.arrayBuffer()), png1);

const livingArchive = await fetch(`${baseUrl}/create`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(livingArchive, 200, "Atelier living visual archive");
const livingArchiveHtml = await livingArchive.text();
assert.match(livingArchiveHtml, /Arquivo Vivo do Atelier/);
assert.match(livingArchiveHtml, /Câmara E2E/);
assert.match(livingArchiveHtml, /VERSÃO ATUAL/);
assert.match(livingArchiveHtml, />V2</);
assert.match(livingArchiveHtml, new RegExp(`/api/artworks/${canvasArtwork.id}/current-image`));

const secondUpload = await uploadPrivate(owner.cookie, png2);
const crossOriginVersion = await fetch(`${baseUrl}/api/artworks/${created.id}/versions`, {
  method: "POST", headers: { cookie: owner.cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify({ fileAssetId: secondUpload.fileAssetId, source: "UPLOAD", notes: "Segunda versão E2E" }),
});
assert.equal(crossOriginVersion.status, 403);

const addVersion = await fetch(`${baseUrl}/api/artworks/${created.id}/versions`, {
  method: "POST", headers: { cookie: owner.cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: secondUpload.fileAssetId, source: "UPLOAD", notes: "Segunda versão E2E" }),
});
await assertHttp(addVersion, 201, "add artwork version");
assert.equal((await addVersion.json()).version.versionNumber, 2);

const detailV2 = await fetch(`${baseUrl}/api/artworks/${created.id}`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(detailV2, 200, "owned artwork detail v2");
const detailV2Payload = await detailV2.json();
assert.equal(detailV2Payload.versions.length, 2);
assert.deepEqual(detailV2Payload.versions.map((item) => item.versionNumber), [2, 1]);
assert.equal(detailV2Payload.versions[0].notes, "Segunda versão E2E");
assert.equal(detailV2Payload.versions[1].notes, "Primeira versão E2E");
const privateReadV2 = await fetch(detailV2Payload.versions[0].readUrl);
await assertHttp(privateReadV2, 200, "private signed artwork read v2");
assert.deepEqual(Buffer.from(await privateReadV2.arrayBuffer()), png2);

const journey = await fetch(`${baseUrl}/journey`, { headers: { cookie: owner.cookie }, cache: "no-store" });
await assertHttp(journey, 200, "Create Journey projection");
const journeyHtml = await journey.text();
assert.match(journeyHtml, /Nova criação registrada/);
assert.match(journeyHtml, /Versão 2 registrada/);
assert.match(journeyHtml, /VISUAL V1/);
assert.match(journeyHtml, /VISUAL V2/);

console.log("CREATE_RUNTIME_E2E=PASS private_upload create_csrf artwork_create private_listing signed_private_read work_chamber_ssr canvas_artwork_materialization canvas_same_origin_read canvas_roundtrip_owner_isolation canvas_same_artwork_versioning canvas_current_image_switch living_visual_archive version_faithful_journey version_csrf immutable_version_history journey_projection");