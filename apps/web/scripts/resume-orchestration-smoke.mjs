import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZxkAAAAASUVORK5CYII=", "base64");

const lessons = [
  "lesson.swd.c0.what_drawing_is", "lesson.swd.c0.hnk_loop", "lesson.swd.c0.drawing_zero", "lesson.swd.c0.intentional_marks", "lesson.swd.c0.seeing_before_naming", "lesson.swd.c0.simple_construction", "lesson.swd.c0.first_correction",
  "lesson.swd.c1.how_hand_moves", "lesson.swd.c1.point_to_point", "lesson.swd.c1.curve_control", "lesson.swd.c1.circle_ellipse", "lesson.swd.c1.direction_parallelism", "lesson.swd.c1.pressure_line_weight", "lesson.swd.c1.rhythm_confidence", "lesson.swd.c1.applied_line",
  "lesson.swd.c2.symbols_vs_observation", "lesson.swd.c2.size_proportion", "lesson.swd.c2.angle_direction", "lesson.swd.c2.position_alignment", "lesson.swd.c2.negative_space", "lesson.swd.c2.landmarks_envelope", "lesson.swd.c2.measurement", "lesson.swd.c2.visual_simplification", "lesson.swd.c2.self_check",
  "lesson.swd.c3.primitives", "lesson.swd.c3.decomposition", "lesson.swd.c3.envelope", "lesson.swd.c3.silhouette", "lesson.swd.c3.relationships", "lesson.swd.c3.overlap", "lesson.swd.c3.applied_construction",
  "lesson.swd.c4.volume_mindset", "lesson.swd.c4.boxes", "lesson.swd.c4.cylinders", "lesson.swd.c4.ellipses_space", "lesson.swd.c4.cross_contours", "lesson.swd.c4.rotation", "lesson.swd.c4.form_combination", "lesson.swd.c4.self_check",
];

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

async function createSession() {
  const response = await fetch(`${baseUrl}/api/session/guest`, { method: "POST" });
  await assertHttp(response, 201, "resume guest session");
  const payload = await response.json();
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie);
  return { userId: payload.userId, cookie: setCookie.split(";", 1)[0] };
}

async function getActivation(cookie) {
  const response = await fetch(`${baseUrl}/api/resume`, { headers: { cookie }, cache: "no-store" });
  await assertHttp(response, 200, "resume snapshot");
  assert.equal(response.headers.get("cache-control"), "no-store");
  return (await response.json()).activation;
}

async function assertStage(cookie, stage, href) {
  const activation = await getActivation(cookie);
  assert.equal(activation.stage, stage);
  assert.equal(activation.nextAction.href, href);
  return activation;
}

async function uploadPrivate(cookie) {
  const prepare = await fetch(`${baseUrl}/api/files/private-upload`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ mimeType: "image/png", byteSize: png.byteLength }),
  });
  await assertHttp(prepare, 201, "resume private upload prepare");
  const intent = await prepare.json();
  const put = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/png", "content-length": String(png.byteLength) },
    body: png,
  });
  await assertHttp(put, 200, "resume private upload put");
  const confirm = await fetch(`${baseUrl}/api/files/confirm`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId: intent.fileAssetId }),
  });
  await assertHttp(confirm, 200, "resume private upload confirm");
  assert.equal((await confirm.json()).ready, true);
  return intent.fileAssetId;
}

async function completeLesson(cookie, lessonKey) {
  const response = await fetch(`${baseUrl}/api/learning/lessons/${encodeURIComponent(lessonKey)}/complete`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ reflection: { source: "resume-orchestration-e2e" } }),
  });
  await assertHttp(response, 200, `complete ${lessonKey}`);
  return response.json();
}

async function createArtwork(cookie, title, type) {
  const fileAssetId = await uploadPrivate(cookie);
  const response = await fetch(`${baseUrl}/api/artworks`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId, title, type, source: "UPLOAD", notes: "Resume orchestration E2E" }),
  });
  await assertHttp(response, 201, `create ${title}`);
  return (await response.json()).artwork;
}

const unauthenticated = await fetch(`${baseUrl}/api/resume`, { cache: "no-store" });
assert.equal(unauthenticated.status, 401);

const learner = await createSession();
await assertStage(learner.cookie, "ONBOARDING", "/onboarding");

const onboarding = await fetch(`${baseUrl}/api/onboarding`, {
  method: "POST",
  headers: { cookie: learner.cookie, "content-type": "application/json" },
  body: JSON.stringify({ displayName: "Resume Tester", preferredPath: "EXPLORE", experienceLevel: "NEW", primaryGoal: "HOBBY", preferredTool: "BOTH" }),
});
await assertHttp(onboarding, 200, "resume onboarding");
await assertStage(learner.cookie, "DRAWING_ZERO", "/drawing-zero");

const baselineAsset = await uploadPrivate(learner.cookie);
const baseline = await fetch(`${baseUrl}/api/drawing-zero`, {
  method: "POST",
  headers: { cookie: learner.cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: baselineAsset, source: "UPLOAD" }),
});
await assertHttp(baseline, 201, "resume Drawing Zero");
await assertStage(learner.cookie, "FIRST_LESSON", "/learn/c0/lesson.swd.c0.what_drawing_is");

await completeLesson(learner.cookie, lessons[0]);
await assertStage(learner.cookie, "FIRST_PRACTICE", "/gym");

const practice = await fetch(`${baseUrl}/api/gym/intentional-line`, {
  method: "POST",
  headers: { cookie: learner.cookie, "content-type": "application/json" },
  body: JSON.stringify({ accuracy: 0.94, smoothness: 0.92, durationMs: 900, pointCount: 40 }),
});
await assertHttp(practice, 200, "resume first practice");
const practicePayload = await practice.json();
assert.equal(practicePayload.skillKey, "skill.drawing.motor.line_control");
await assertStage(learner.cookie, "FOUNDATION", "/learn/c0/lesson.swd.c0.hnk_loop");

for (const lessonKey of lessons.slice(1)) await completeLesson(learner.cookie, lessonKey);
const afterFoundation = await assertStage(learner.cookie, "ALPHA_GATE", "/alpha");
assert.equal(afterFoundation.completedSteps, 5);

const observation = await fetch(`${baseUrl}/api/observation`, {
  method: "POST",
  headers: { cookie: learner.cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.observation.ratio_match", answerIndex: 2, responseMs: 1800 }),
});
await assertHttp(observation, 200, "resume observation evidence");
assert.equal((await observation.json()).skillKey, "skill.drawing.perception.proportion");

const construction = await fetch(`${baseUrl}/api/construction`, {
  method: "POST",
  headers: { cookie: learner.cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.construction.decomposition", answerIndex: 1 }),
});
await assertHttp(construction, 200, "resume construction evidence");
assert.equal((await construction.json()).skillKey, "skill.drawing.shape.decomposition");

const form = await fetch(`${baseUrl}/api/form`, {
  method: "POST",
  headers: { cookie: learner.cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.form.box_orientation", answerIndex: 1 }),
});
await assertHttp(form, 200, "resume form evidence");
assert.equal((await form.json()).skillKey, "skill.drawing.form.box");

await createArtwork(learner.cookie, "Drawing Zero Revisited", "STUDY");
await createArtwork(learner.cookie, "Alpha Capstone E2E", "PROJECT");

const gateSnapshotResponse = await fetch(`${baseUrl}/api/alpha/gate`, { headers: { cookie: learner.cookie }, cache: "no-store" });
await assertHttp(gateSnapshotResponse, 200, "resume alpha gate snapshot");
const gateSnapshot = await gateSnapshotResponse.json();
assert.equal(gateSnapshot.c4Completed, true);
assert.equal(gateSnapshot.hasDrawingZeroRevisit, true);
assert.equal(gateSnapshot.hasCapstone, true);
assert.ok(gateSnapshot.domains.every((domain) => domain.evidenceCount > 0));
assert.ok(["READY", "READY_WITH_REVIEW"].includes(gateSnapshot.status));

const blockedGate = await fetch(`${baseUrl}/api/alpha/gate`, {
  method: "POST",
  headers: { cookie: learner.cookie, origin: "https://malicious.example" },
});
assert.equal(blockedGate.status, 403);
assert.equal((await blockedGate.json()).code, "CROSS_ORIGIN_REQUEST_BLOCKED");

const gate = await fetch(`${baseUrl}/api/alpha/gate`, { method: "POST", headers: { cookie: learner.cookie } });
await assertHttp(gate, 200, "resume alpha gate milestone");
assert.ok(["READY", "READY_WITH_REVIEW"].includes((await gate.json()).status));

const complete = await assertStage(learner.cookie, "COMPLETE", "/journey");
assert.equal(complete.completedSteps, complete.totalSteps);
assert.equal(complete.progress, 1);
assert.equal(complete.nextLessonKey, null);

const repeatedGate = await fetch(`${baseUrl}/api/alpha/gate`, { method: "POST", headers: { cookie: learner.cookie } });
await assertHttp(repeatedGate, 200, "resume alpha gate idempotency");

const home = await fetch(`${baseUrl}/`, { headers: { cookie: learner.cookie }, cache: "no-store" });
await assertHttp(home, 200, "resume Home projection");
const homeHtml = await home.text();
assert.match(homeHtml, /Revisar minha evolução/);
assert.match(homeHtml, /6\/6/);

const journey = await fetch(`${baseUrl}/journey`, { headers: { cookie: learner.cookie }, cache: "no-store" });
await assertHttp(journey, 200, "resume Journey projection");
const journeyHtml = await journey.text();
assert.match(journeyHtml, /Foundation Alpha concluída/);
assert.match(journeyHtml, /C4 · Form concluído/);

console.log("RESUME_ORCHESTRATION_E2E=PASS unauthenticated_resume onboarding_stage drawing_zero_stage first_lesson_stage first_practice_stage foundation_stage all_cycles alpha_gate_stage cross_domain_evidence form_skill_contract capstone revisit alpha_gate_csrf alpha_gate_completion complete_stage home_projection journey_projection gate_idempotency");