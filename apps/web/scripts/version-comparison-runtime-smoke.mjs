import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const png1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZxkAAAAASUVORK5CYII=", "base64");
const png2 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z8BQDwAFgwJ/l2GfWQAAAABJRU5ErkJggg==", "base64");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const preservedV2 = "silhueta simples e legível";
const transformedV2 = "peso das linhas nas áreas de sombra";
const reviewPlanV2 = { preserve: preservedV2, transform: transformedV2, baseVersionNumber: 1 };
const reflectionV2 = "A sombra ganhou mais hierarquia sem perder a leitura da silhueta.";
const secondFile = await uploadPrivate(ownerCookie, png2);
const addV2 = await fetch(`${baseUrl}/api/artworks/${artwork.id}/versions`, {
  method: "POST",
  headers: { cookie: ownerCookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: secondFile, source: "CANVAS", notes: reflectionV2, reviewPlan: reviewPlanV2 }),
});
await assertHttp(addV2, 201, "comparison create artwork v2 with structured plan");
const version2 = (await addV2.json()).version;
assert.equal(version2.versionNumber, 2);
assert.deepEqual(version2.reviewPlan, reviewPlanV2);

const preservedV3 = "hierarquia das sombras já estabelecida";
const transformedV3 = "ritmo dos contornos secundários";
const reviewPlanV3 = { preserve: preservedV3, transform: transformedV3, baseVersionNumber: 2 };
const reflectionV3 = "Os contornos secundários ficaram menos uniformes e a leitura ganhou ritmo.";
const thirdFile = await uploadPrivate(ownerCookie, png1);
const addV3 = await fetch(`${baseUrl}/api/artworks/${artwork.id}/versions`, {
  method: "POST",
  headers: { cookie: ownerCookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: thirdFile, source: "CANVAS", notes: reflectionV3, reviewPlan: reviewPlanV3 }),
});
await assertHttp(addV3, 201, "comparison create artwork v3 with structured plan");
const version3 = (await addV3.json()).version;
assert.equal(version3.versionNumber, 3);
assert.deepEqual(version3.reviewPlan, reviewPlanV3);

const staleVersion = await fetch(`${baseUrl}/api/artworks/${artwork.id}/versions`, {
  method: "POST",
  headers: { cookie: ownerCookie, "content-type": "application/json" },
  body: JSON.stringify({
    fileAssetId: secondFile,
    source: "CANVAS",
    notes: "Esta reflexão não pode persistir.",
    reviewPlan: { ...reviewPlanV2, baseVersionNumber: 1 },
  }),
});
await assertHttp(staleVersion, 400, "stale review plan rejected after v3");
assert.equal((await staleVersion.json()).code, "INVALID_REVIEW_PLAN");

const apiDetail = await fetch(`${baseUrl}/api/artworks/${artwork.id}`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(apiDetail, 200, "comparison artwork detail api");
const detailPayload = await apiDetail.json();
assert.deepEqual(detailPayload.versions.map((version) => version.versionNumber), [3, 2, 1]);
assert.deepEqual(detailPayload.versions.map((version) => version.notes), [reflectionV3, reflectionV2, "Primeiro passe preservado"]);
assert.deepEqual(detailPayload.versions[0].reviewPlan, reviewPlanV3);
assert.deepEqual(detailPayload.versions[1].reviewPlan, reviewPlanV2);
assert.equal(detailPayload.versions[2].reviewPlan, null);

const page = await fetch(`${baseUrl}/create/${artwork.id}`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(page, 200, "comparison artwork detail page");
const html = await page.text();
assert.match(html, /Mesa E2E/);
assert.match(html, /Mesa de Comparação/);
assert.match(html, /RÉGUA DE SOBREPOSIÇÃO/);
assert.match(html, /Base V2/);
assert.match(html, /Sobreposição V3/);
assert.match(html, /Linha de Revisão/);
assert.match(html, /Navegue pelo tempo da obra sem procurar cartões no arquivo/);
assert.ok((html.match(/review-timeline-node/g) ?? []).length >= 2, "revision timeline must expose both recognized cycles");
assert.match(html, new RegExp(`/create/${artwork.id}\\?cycle=2#version-comparison`));
assert.match(html, new RegExp(`/create/${artwork.id}#version-comparison`));
assert.match(html, /Rever ciclo anterior/);
assert.match(html, /aria-current="step"/);
assert.match(html, /loading="eager"/);
assert.match(html, /loading="lazy"/);
assert.match(html, /Caderno de Revisões/);
assert.match(html, /Cada passagem preserva resultado, intenção e reflexão/);
assert.ok((html.match(/version-cycle-record/g) ?? []).length >= 2, "historical notebook must render both V1→V2 and V2→V3 cycle records");
assert.ok((html.match(/ESTRUTURADO/g) ?? []).length >= 2, "both historical review cycles must remain structured");
for (const text of [reflectionV2, reflectionV3, preservedV2, transformedV2, preservedV3, transformedV3]) {
  assert.match(html, new RegExp(escapeRegex(text)));
}
assert.match(html, /CICLO DE REVISÃO/);
assert.match(html, /RESULTADO VISÍVEL/);
assert.match(html, /A Mesa não decide se a intenção foi cumprida/);
assert.match(html, /não existe nota automática de qualidade/);
assert.match(html, /version-reference-cycle/);
assert.match(html, /Rever este ciclo na Mesa/);
assert.match(html, /CROMA · DECISÃO DE REVISÃO/);
assert.match(html, /Levar decisão para a Câmara/);
assert.match(html, /Criar próxima versão na Câmara/);
assert.match(html, new RegExp(`/create/work\\?artworkId=${artwork.id}`));

const historicalPage = await fetch(`${baseUrl}/create/${artwork.id}?cycle=2`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(historicalPage, 200, "historical comparison v1 to v2");
const historicalHtml = await historicalPage.text();
assert.match(historicalHtml, /Mesa Histórica/);
assert.match(historicalHtml, /MODO SOMENTE LEITURA/);
assert.match(historicalHtml, /O passado não vira uma nova branch da obra/);
assert.match(historicalHtml, /Base V1/);
assert.match(historicalHtml, /Sobreposição V2/);
assert.match(historicalHtml, /RESULTADO/);
assert.match(historicalHtml, /CICLO HISTÓRICO/);
assert.match(historicalHtml, /Linha de Revisão/);
assert.match(historicalHtml, /Mais antigo/);
assert.match(historicalHtml, /Mais recente/);
assert.match(historicalHtml, /aria-current="step"/);
assert.match(historicalHtml, new RegExp(escapeRegex(preservedV2)));
assert.match(historicalHtml, new RegExp(escapeRegex(transformedV2)));
assert.match(historicalHtml, new RegExp(escapeRegex(reflectionV2)));
assert.match(historicalHtml, /Voltar à versão atual/);
assert.doesNotMatch(historicalHtml, /Levar decisão para a Câmara/);
assert.doesNotMatch(historicalHtml, /CROMA · DECISÃO DE REVISÃO/);
assert.doesNotMatch(historicalHtml, /Criar V3/);

const invalidHistorical = await fetch(`${baseUrl}/create/${artwork.id}?cycle=999`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(invalidHistorical, 200, "invalid historical focus falls back latest");
const invalidHtml = await invalidHistorical.text();
assert.match(invalidHtml, /Mesa de Comparação/);
assert.doesNotMatch(invalidHtml, /Mesa Histórica/);
assert.match(invalidHtml, /Base V2/);
assert.match(invalidHtml, /Sobreposição V3/);
assert.match(invalidHtml, /Levar decisão para a Câmara/);
assert.match(invalidHtml, /Linha de Revisão/);

const currentCycleIgnored = await fetch(`${baseUrl}/create/${artwork.id}?cycle=3`, { headers: { cookie: ownerCookie }, cache: "no-store" });
await assertHttp(currentCycleIgnored, 200, "current cycle query remains latest mode");
const currentCycleHtml = await currentCycleIgnored.text();
assert.match(currentCycleHtml, /Mesa de Comparação/);
assert.doesNotMatch(currentCycleHtml, /Mesa Histórica/);
assert.match(currentCycleHtml, /Base V2/);
assert.match(currentCycleHtml, /Sobreposição V3/);
assert.match(currentCycleHtml, /Linha de Revisão/);

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
assert.doesNotMatch(chamberHtml, new RegExp(escapeRegex(reflectionV3)));

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
const outsiderHistorical = await fetch(`${baseUrl}/create/${artwork.id}?cycle=2`, { headers: { cookie: outsiderCookie }, cache: "no-store" });
await assertHttp(outsiderHistorical, 200, "historical comparison outsider detail page");
assert.match(await outsiderHistorical.text(), /Esta etapa não foi encontrada/);
const outsiderHandoff = await fetch(`${baseUrl}/create/work?artworkId=${encodeURIComponent(artwork.id)}`, { headers: { cookie: outsiderCookie }, cache: "no-store" });
await assertHttp(outsiderHandoff, 200, "private review outsider Chamber page");
assert.match(await outsiderHandoff.text(), /Esta etapa não foi encontrada/);

console.log("VERSION_COMPARISON_E2E=PASS three_version_truth structured_review_ledger historical_review_notebook review_timeline lazy_history_images temporal_stepper two_preserved_cycles historical_exact_cycle readonly_historical_no_branch invalid_cycle_falls_back_latest current_cycle_stays_latest free_process_reflection invalid_base_rejected shared_cycle_resolver no_art_score private_session_handoff legacy_url_canonicalization chamber_return owner_isolation");
