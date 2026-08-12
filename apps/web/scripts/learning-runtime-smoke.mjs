import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZxkAAAAASUVORK5CYII=", "base64");

const C0 = [
  "lesson.swd.c0.what_drawing_is",
  "lesson.swd.c0.hnk_loop",
  "lesson.swd.c0.drawing_zero",
  "lesson.swd.c0.intentional_marks",
  "lesson.swd.c0.seeing_before_naming",
  "lesson.swd.c0.simple_construction",
  "lesson.swd.c0.first_correction",
];
const C1_FIRST = "lesson.swd.c1.how_hand_moves";
const C2_FIRST = "lesson.swd.c2.symbols_vs_observation";

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

async function complete(cookie, lessonKey, reflection = {}) {
  return fetch(`${baseUrl}/api/learning/lessons/${encodeURIComponent(lessonKey)}/complete`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ reflection }),
  });
}

async function createSession() {
  const response = await fetch(`${baseUrl}/api/session/guest`, { method: "POST" });
  await assertHttp(response, 201, "guest session");
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie);
  return setCookie.split(";", 1)[0];
}

async function createDrawingZero(cookie) {
  const prepare = await fetch(`${baseUrl}/api/files/private-upload`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ mimeType: "image/png", byteSize: png.byteLength }),
  });
  await assertHttp(prepare, 201, "prepare Drawing Zero upload");
  const intent = await prepare.json();

  const put = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/png", "content-length": String(png.byteLength) },
    body: png,
  });
  await assertHttp(put, 200, "upload Drawing Zero object");

  const confirm = await fetch(`${baseUrl}/api/files/confirm`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId: intent.fileAssetId }),
  });
  await assertHttp(confirm, 200, "confirm Drawing Zero upload");
  assert.equal((await confirm.json()).ready, true);

  const drawingZero = await fetch(`${baseUrl}/api/drawing-zero`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId: intent.fileAssetId, source: "UPLOAD" }),
  });
  await assertHttp(drawingZero, 201, "submit Drawing Zero");
  return drawingZero.json();
}

const cookie = await createSession();

const onboarding = await fetch(`${baseUrl}/api/onboarding`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ displayName: "Learning E2E", preferredPath: "MANGA", experienceLevel: "NEW", primaryGoal: "CAREER", preferredTool: "BOTH" }),
});
await assertHttp(onboarding, 200, "learning onboarding");

const crossOrigin = await fetch(`${baseUrl}/api/learning/lessons/${encodeURIComponent(C0[0])}/complete`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify({ reflection: { test: true } }),
});
assert.equal(crossOrigin.status, 403);
assert.equal((await crossOrigin.json()).code, "CROSS_ORIGIN_REQUEST_BLOCKED");

const skippedFirst = await complete(cookie, C0[1]);
assert.equal(skippedFirst.status, 409);
assert.equal((await skippedFirst.json()).code, "LESSON_PREREQUISITES_REQUIRED");

const first = await complete(cookie, C0[0], { insight: "Desenhar é observar, tentar, comparar e corrigir." });
await assertHttp(first, 200, "complete C0 lesson 1");
let progress = await first.json();
assert.equal(progress.cycleKey, "cycle.swd.c0");
assert.equal(progress.completedLessons, 1);
assert.equal(progress.cycleCompleted, false);

const second = await complete(cookie, C0[1], { loop: "HNK" });
await assertHttp(second, 200, "complete C0 lesson 2");
progress = await second.json();
assert.equal(progress.completedLessons, 2);

const drawingZeroGate = await complete(cookie, C0[2]);
assert.equal(drawingZeroGate.status, 409);
assert.equal((await drawingZeroGate.json()).code, "DRAWING_ZERO_REQUIRED");

const drawingZero = await createDrawingZero(cookie);
assert.equal(drawingZero.baselineOnly, true);
assert.equal(drawingZero.visibility, "PRIVATE");

for (let index = 2; index < C0.length; index += 1) {
  const response = await complete(cookie, C0[index], { e2e: true, order: index + 1 });
  await assertHttp(response, 200, `complete C0 lesson ${index + 1}`);
  progress = await response.json();
  assert.equal(progress.completedLessons, index + 1);
}
assert.equal(progress.cycleCompleted, true);
assert.equal(progress.cycleKey, "cycle.swd.c0");

const blockedC2 = await complete(cookie, C2_FIRST);
assert.equal(blockedC2.status, 409);
assert.equal((await blockedC2.json()).code, "CYCLE_PREREQUISITE_REQUIRED");

const c1 = await complete(cookie, C1_FIRST, { focus: "controle consciente" });
await assertHttp(c1, 200, "unlock and complete first C1 lesson");
const c1Progress = await c1.json();
assert.equal(c1Progress.cycleKey, "cycle.swd.c1");
assert.equal(c1Progress.completedLessons, 1);
assert.equal(c1Progress.cycleCompleted, false);

const learn = await fetch(`${baseUrl}/learn`, { headers: { cookie }, cache: "no-store" });
await assertHttp(learn, 200, "learning campaign");
const learnHtml = await learn.text();
assert.match(learnHtml, /Portal do Olhar/);
assert.match(learnHtml, /Atelier do Gesto/);
assert.match(learnHtml, /Sociedade Croma · Campanha Foundation/);
assert.match(learnHtml, /\/learn\/c1\//);

const journey = await fetch(`${baseUrl}/journey`, { headers: { cookie }, cache: "no-store" });
await assertHttp(journey, 200, "learning Journey projection");
const journeyHtml = await journey.text();
assert.match(journeyHtml, /C0 · I Can Draw concluído/);
assert.match(journeyHtml, /Eu consigo observar, tentar, comparar e corrigir/);

const idempotent = await complete(cookie, C0[0], { insight: "segunda reflexão" });
await assertHttp(idempotent, 200, "idempotent completed lesson update");
const idempotentProgress = await idempotent.json();
assert.equal(idempotentProgress.completedLessons, C0.length);
assert.equal(idempotentProgress.cycleCompleted, true);

console.log("LEARNING_RUNTIME_E2E=PASS lesson_csrf prerequisite_order drawing_zero_gate drawing_zero_unlock c0_progress cycle_completion c1_unlock future_cycle_lock learning_campaign journey_cycle_projection lesson_idempotency");
