import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const png1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZxkAAAAASUVORK5CYII=", "base64");
const png2 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z8BQDwAFgwJ/l2GfWQAAAABJRU5ErkJggg==", "base64");

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

async function createSession() {
  const response = await fetch(`${baseUrl}/api/session/guest`, { method: "POST" });
  await assertHttp(response, 201, "comparison guest session");
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
  await assertHttp(prepare, 201, "comparison prepare upload");
  const intent = await prepare.json();
  const upload = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/png", "content-length": String(body.byteLength) },
    body,
  });
  await assertHttp(upload, 200, "comparison put object");
  const confirm = await fetch(`${baseUrl}/api/files/confirm`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId: intent.fileAssetId }),
  });
  await assertHttp(confirm, 200, "comparison confirm upload");
  return intent.fileAssetId;
}

const ownerCookie = await createSession();
const firstFile = await uploadPrivate(ownerCookie, png1);
const create = await fetch(`${baseUrl}/api/artworks`, {
  method: "POST",
  headers: { cookie: ownerCookie, "content-type": "application/json" },
  body: JSON.stringify({
    fileAssetId: firstFile,
    title: "Mesa E2E",
    type: "ARTWORK",
    source: "CANVAS",
    notes: "Primeiro passe preservado",
  }),
});
await assertHttp(create, 201, "comparison create artwork v1");
const artwork = (await create.json()).artwork;

const secondFile = await uploadPrivate(ownerCookie, png2);
const addVersion = await fetch(`${baseUrl}/api/artworks/${artwork.id}/versions`, {
  method: "POST",
  headers: { cookie: ownerCookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: secondFile, source: "CANVAS", notes: "Segundo passe atual" }),
});
await assertHttp(addVersion, 201, "comparison create artwork v2");
assert.equal((await addVersion.json()).version.versionNumber, 2);

const apiDetail = await fetch(`${baseUrl}/api/artworks/${artwork.id}`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(apiDetail, 200, "comparison artwork detail api");
const detailPayload = await apiDetail.json();
assert.deepEqual(detailPayload.versions.map((version) => version.versionNumber), [2, 1]);
assert.deepEqual(detailPayload.versions.map((version) => version.notes), ["Segundo passe atual", "Primeiro passe preservado"]);

const page = await fetch(`${baseUrl}/create/${artwork.id}`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(page, 200, "comparison artwork detail page");
const html = await page.text();
assert.match(html, /Mesa E2E/);
assert.match(html, /Mesa de Comparação/);
assert.match(html, /RÉGUA DE SOBREPOSIÇÃO/);
assert.match(html, /Base V1/);
assert.match(html, /Sobreposição V2/);
assert.match(html, /Primeiro passe preservado/);
assert.match(html, /Segundo passe atual/);
assert.match(html, /CROMA · DECISÃO DE REVISÃO/);
assert.match(html, /Levar decisão para a Câmara/);
assert.match(html, /Criar próxima versão na Câmara/);
assert.match(html, new RegExp(`/create/work\\?artworkId=${artwork.id}`));

const preserveIntent = "Preservar a silhueta simples";
const transformIntent = "Transformar o peso das linhas";
const handoff = new URLSearchParams({ artworkId: artwork.id, preserve: preserveIntent, transform: transformIntent });
const chamberWithIntent = await fetch(`${baseUrl}/create/work?${handoff.toString()}`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(chamberWithIntent, 200, "review intent Work Chamber handoff");
const chamberIntentHtml = await chamberWithIntent.text();
assert.match(chamberIntentHtml, /decisão da Mesa chegou como intenção da próxima passagem/);
assert.match(chamberIntentHtml, /DECISÃO TRAZIDA DA MESA/);
assert.match(chamberIntentHtml, /Preservar a silhueta simples/);
assert.match(chamberIntentHtml, /Transformar o peso das linhas/);
assert.match(chamberIntentHtml, /o draft continua tendo prioridade e não é sobrescrito/);

const incompleteHandoff = new URLSearchParams({ artworkId: artwork.id, preserve: preserveIntent });
const chamberWithoutCompleteIntent = await fetch(`${baseUrl}/create/work?${incompleteHandoff.toString()}`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(chamberWithoutCompleteIntent, 200, "incomplete review intent ignored");
assert.doesNotMatch(await chamberWithoutCompleteIntent.text(), /DECISÃO TRAZIDA DA MESA/);

const outsiderCookie = await createSession();
const outsider = await fetch(`${baseUrl}/create/${artwork.id}`, { headers: { cookie: outsiderCookie }, cache: "no-store" });
await assertHttp(outsider, 200, "comparison outsider detail page");
assert.match(await outsider.text(), /Esta etapa não foi encontrada/);
const outsiderHandoff = await fetch(`${baseUrl}/create/work?${handoff.toString()}`, { headers: { cookie: outsiderCookie }, cache: "no-store" });
await assertHttp(outsiderHandoff, 200, "review intent outsider Chamber page");
assert.match(await outsiderHandoff.text(), /Esta etapa não foi encontrada/);

console.log("VERSION_COMPARISON_E2E=PASS two_version_truth reference_v1 current_v2 side_by_side wipe_ruler process_notes review_intent_handoff incomplete_intent_fail_closed chamber_return owner_isolation");
