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

const preservedDecision = "silhueta simples e legível";
const transformedDecision = "peso das linhas nas áreas de sombra";
const reviewPlan = {
  preserve: preservedDecision,
  transform: transformedDecision,
  baseVersionNumber: 1,
};
const processReflection = "A sombra ganhou mais hierarquia sem perder a leitura da silhueta.";
const secondFile = await uploadPrivate(ownerCookie, png2);
const addVersion = await fetch(`${baseUrl}/api/artworks/${artwork.id}/versions`, {
  method: "POST",
  headers: { cookie: ownerCookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: secondFile, source: "CANVAS", notes: processReflection, reviewPlan }),
});
await assertHttp(addVersion, 201, "comparison create artwork v2 with structured plan");
const addedVersion = (await addVersion.json()).version;
assert.equal(addedVersion.versionNumber, 2);
assert.deepEqual(addedVersion.reviewPlan, reviewPlan);

const staleVersion = await fetch(`${baseUrl}/api/artworks/${artwork.id}/versions`, {
  method: "POST",
  headers: { cookie: ownerCookie, "content-type": "application/json" },
  body: JSON.stringify({
    fileAssetId: secondFile,
    source: "CANVAS",
    notes: "Esta reflexão não pode persistir.",
    reviewPlan: { ...reviewPlan, baseVersionNumber: 1 },
  }),
});
await assertHttp(staleVersion, 400, "stale review plan rejected by current-version authority");
assert.equal((await staleVersion.json()).code, "INVALID_REVIEW_PLAN");

const apiDetail = await fetch(`${baseUrl}/api/artworks/${artwork.id}`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(apiDetail, 200, "comparison artwork detail api");
const detailPayload = await apiDetail.json();
assert.deepEqual(detailPayload.versions.map((version) => version.versionNumber), [2, 1]);
assert.deepEqual(detailPayload.versions.map((version) => version.notes), [processReflection, "Primeiro passe preservado"]);
assert.deepEqual(detailPayload.versions[0].reviewPlan, reviewPlan);
assert.equal(detailPayload.versions[1].reviewPlan, null);

const page = await fetch(`${baseUrl}/create/${artwork.id}`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(page, 200, "comparison artwork detail page");
const html = await page.text();
assert.match(html, /Mesa E2E/);
assert.match(html, /Mesa de Comparação/);
assert.match(html, /RÉGUA DE SOBREPOSIÇÃO/);
assert.match(html, /Base V1/);
assert.match(html, /Sobreposição V2/);
assert.match(html, /Primeiro passe preservado/);
assert.match(html, new RegExp(processReflection.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(html, /CICLO DE REVISÃO/);
assert.match(html, /V1/);
assert.match(html, /V2/);
assert.match(html, /RESULTADO VISÍVEL/);
assert.match(html, new RegExp(preservedDecision));
assert.match(html, new RegExp(transformedDecision));
assert.match(html, /A Mesa não decide se a intenção foi cumprida/);
assert.match(html, /não existe nota automática de qualidade/);
assert.match(html, /CROMA · DECISÃO DE REVISÃO/);
assert.match(html, /Levar decisão para a Câmara/);
assert.match(html, /Criar próxima versão na Câmara/);
assert.match(html, new RegExp(`/create/work\\?artworkId=${artwork.id}`));

const preserveIntent = "Preservar a silhueta simples";
const transformIntent = "Transformar o peso das linhas";
const leakedHandoff = new URLSearchParams({ artworkId: artwork.id, preserve: preserveIntent, transform: transformIntent });
const leakedResponse = await fetch(`${baseUrl}/create/work?${leakedHandoff.toString()}`, {
  headers: { cookie: ownerCookie },
  redirect: "manual",
  cache: "no-store",
});
await assertHttp(leakedResponse, 307, "private review intent canonical redirect");
assert.ok(leakedResponse.headers.get("x-request-id"));
const leakedLocation = leakedResponse.headers.get("location");
assert.ok(leakedLocation);
const canonicalUrl = new URL(leakedLocation, baseUrl);
assert.equal(canonicalUrl.pathname, "/create/work");
assert.equal(canonicalUrl.searchParams.get("artworkId"), artwork.id);
assert.equal(canonicalUrl.searchParams.has("preserve"), false);
assert.equal(canonicalUrl.searchParams.has("transform"), false);
const chamberFromCanonicalUrl = await fetch(canonicalUrl, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(chamberFromCanonicalUrl, 200, "private review canonical Chamber render");
const chamberHtml = await chamberFromCanonicalUrl.text();
assert.match(chamberHtml, /reflexão desta nova passagem começa limpa/);
assert.doesNotMatch(chamberHtml, /Preservar a silhueta simples/);
assert.doesNotMatch(chamberHtml, /Transformar o peso das linhas/);
assert.doesNotMatch(chamberHtml, /DECISÃO TRAZIDA DA MESA/);
assert.doesNotMatch(chamberHtml, new RegExp(processReflection.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

const incompleteHandoff = new URLSearchParams({ artworkId: artwork.id, preserve: preserveIntent });
const incompleteResponse = await fetch(`${baseUrl}/create/work?${incompleteHandoff.toString()}`, {
  headers: { cookie: ownerCookie },
  redirect: "manual",
  cache: "no-store",
});
await assertHttp(incompleteResponse, 307, "incomplete legacy intent canonical redirect");
const incompleteLocation = incompleteResponse.headers.get("location");
assert.ok(incompleteLocation);
const incompleteCanonical = new URL(incompleteLocation, baseUrl);
assert.equal(incompleteCanonical.searchParams.get("artworkId"), artwork.id);
assert.equal(incompleteCanonical.searchParams.has("preserve"), false);
assert.equal(incompleteCanonical.searchParams.has("transform"), false);

const outsiderCookie = await createSession();
const outsider = await fetch(`${baseUrl}/create/${artwork.id}`, { headers: { cookie: outsiderCookie }, cache: "no-store" });
await assertHttp(outsider, 200, "comparison outsider detail page");
assert.match(await outsider.text(), /Esta etapa não foi encontrada/);
const outsiderHandoff = await fetch(`${baseUrl}/create/work?artworkId=${encodeURIComponent(artwork.id)}`, { headers: { cookie: outsiderCookie }, cache: "no-store" });
await assertHttp(outsiderHandoff, 200, "private review outsider Chamber page");
assert.match(await outsiderHandoff.text(), /Esta etapa não foi encontrada/);

console.log("VERSION_COMPARISON_E2E=PASS two_version_truth structured_review_ledger free_process_reflection invalid_base_rejected legacy_fallback_contract no_art_score private_session_handoff legacy_url_canonicalization chamber_return owner_isolation");
