import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const opsToken = process.env.ALPHA_OPS_TOKEN;
const consentVersion = "closed-alpha-v1";
const cohortLabel = "Cohort Completion E2E";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZxkAAAAASUVORK5CYII=", "base64");
assert.ok(opsToken, "ALPHA_OPS_TOKEN is required for cohort completion smoke");

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

async function uploadPrivate(cookie) {
  const prepare = await fetch(`${baseUrl}/api/files/private-upload`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ mimeType: "image/png", byteSize: png.byteLength }),
  });
  await assertHttp(prepare, 201, "cohort upload prepare");
  const intent = await prepare.json();
  const put = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/png", "content-length": String(png.byteLength) },
    body: png,
  });
  await assertHttp(put, 200, "cohort upload put");
  const confirm = await fetch(`${baseUrl}/api/files/confirm`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId: intent.fileAssetId }),
  });
  await assertHttp(confirm, 200, "cohort upload confirm");
  return intent.fileAssetId;
}

async function completeLesson(cookie, lessonKey) {
  const response = await fetch(`${baseUrl}/api/learning/lessons/${encodeURIComponent(lessonKey)}/complete`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ reflection: { source: "cohort-completion-e2e" } }),
  });
  await assertHttp(response, 200, `cohort lesson ${lessonKey}`);
}

async function createArtwork(cookie, title, type) {
  const fileAssetId = await uploadPrivate(cookie);
  const response = await fetch(`${baseUrl}/api/artworks`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId, title, type, source: "UPLOAD", notes: "Closed Alpha cohort completion E2E" }),
  });
  await assertHttp(response, 201, `cohort artwork ${title}`);
}

const opsSession = await fetch(`${baseUrl}/api/ops/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token: opsToken }),
});
await assertHttp(opsSession, 200, "cohort ops session");
const opsCookie = opsSession.headers.get("set-cookie")?.split(";", 1)[0];
assert.ok(opsCookie);

const inviteCreate = await fetch(`${baseUrl}/api/ops/invites`, {
  method: "POST",
  headers: { cookie: opsCookie, "content-type": "application/json" },
  body: JSON.stringify({ label: cohortLabel, maxUses: 1, expiresInDays: 7 }),
});
await assertHttp(inviteCreate, 201, "cohort invite create");
const invitePayload = await inviteCreate.json();

const redeem = await fetch(`${baseUrl}/api/invites/redeem`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ code: invitePayload.code, consentAccepted: true, consentVersion }),
});
await assertHttp(redeem, 201, "cohort invite redeem");
const redeemPayload = await redeem.json();
assert.equal(redeemPayload.inviteLabel, cohortLabel);
const cookie = redeem.headers.get("set-cookie")?.split(";", 1)[0];
assert.ok(cookie);

const onboarding = await fetch(`${baseUrl}/api/onboarding`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ displayName: "Cohort Finisher", preferredPath: "EXPLORE", experienceLevel: "NEW", primaryGoal: "CAREER", preferredTool: "BOTH" }),
});
await assertHttp(onboarding, 200, "cohort onboarding");

const baselineAsset = await uploadPrivate(cookie);
const baseline = await fetch(`${baseUrl}/api/drawing-zero`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: baselineAsset, source: "UPLOAD" }),
});
await assertHttp(baseline, 201, "cohort Drawing Zero");

await completeLesson(cookie, lessons[0]);
const motor = await fetch(`${baseUrl}/api/gym/intentional-line`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ accuracy: 0.96, smoothness: 0.94, durationMs: 900, pointCount: 42 }),
});
await assertHttp(motor, 200, "cohort motor evidence");

for (const lessonKey of lessons.slice(1)) await completeLesson(cookie, lessonKey);

const observation = await fetch(`${baseUrl}/api/observation`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.observation.ratio_match", answerIndex: 2, responseMs: 1600 }),
});
await assertHttp(observation, 200, "cohort perception evidence");

const construction = await fetch(`${baseUrl}/api/construction`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.construction.decomposition", answerIndex: 1 }),
});
await assertHttp(construction, 200, "cohort construction evidence");

const form = await fetch(`${baseUrl}/api/form`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.form.box_orientation", answerIndex: 1 }),
});
await assertHttp(form, 200, "cohort form evidence");

await createArtwork(cookie, "Drawing Zero Revisited", "STUDY");
await createArtwork(cookie, "Closed Alpha Capstone", "PROJECT");

const gate = await fetch(`${baseUrl}/api/alpha/gate`, { method: "POST", headers: { cookie } });
await assertHttp(gate, 200, "cohort Alpha Gate");
assert.ok(["READY", "READY_WITH_REVIEW"].includes((await gate.json()).status));

const resume = await fetch(`${baseUrl}/api/resume`, { headers: { cookie }, cache: "no-store" });
await assertHttp(resume, 200, "cohort complete resume");
assert.equal((await resume.json()).activation.stage, "COMPLETE");

const heartbeat = await fetch(`${baseUrl}/api/activity/heartbeat`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ path: "/journey", metadata: { source: "cohort-completion-e2e" } }),
});
await assertHttp(heartbeat, 200, "cohort complete heartbeat");
assert.equal((await heartbeat.json()).stage, "COMPLETE");

const crossOriginFeedback = await fetch(`${baseUrl}/api/feedback`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify({ category: "USABILITY", rating: 5, message: "Should be blocked", path: "/journey" }),
});
assert.equal(crossOriginFeedback.status, 403);
assert.equal((await crossOriginFeedback.json()).code, "CROSS_ORIGIN_REQUEST_BLOCKED");

const feedback = await fetch(`${baseUrl}/api/feedback`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ category: "LEARNING", rating: 5, message: "Fluxo completo do Closed Alpha validado.", path: "/journey" }),
});
await assertHttp(feedback, 201, "cohort feedback");

const cohorts = await fetch(`${baseUrl}/api/ops/cohorts`, { headers: { cookie: opsCookie }, cache: "no-store" });
await assertHttp(cohorts, 200, "cohort analytics");
const cohort = (await cohorts.json()).cohorts.find((item) => item.label === cohortLabel);
assert.ok(cohort);
assert.equal(cohort.redeemed, 1);
assert.equal(cohort.onboarded, 1);
assert.equal(cohort.active7d, 1);
assert.equal(cohort.evidenceUsers, 1);
assert.equal(cohort.completed, 1);
assert.equal(cohort.feedbackCount, 1);
assert.equal(cohort.averageRating, 5);
assert.equal(cohort.activationRate, 100);
assert.equal(cohort.completionRate, 100);

const testerDetail = await fetch(`${baseUrl}/api/ops/testers/${redeemPayload.userId}`, { headers: { cookie: opsCookie }, cache: "no-store" });
await assertHttp(testerDetail, 200, "cohort tester detail");
const tester = (await testerDetail.json()).tester;
assert.equal(tester.cohortLabel, cohortLabel);
assert.equal(tester.lastStage, "COMPLETE");

const journey = await fetch(`${baseUrl}/journey`, { headers: { cookie }, cache: "no-store" });
await assertHttp(journey, 200, "cohort graduation Journey");
const journeyHtml = await journey.text();
assert.match(journeyHtml, /Foundation Alpha · Graduation/);
assert.match(journeyHtml, /Drawing Zero · Before \/ After/);

console.log("COHORT_COMPLETION_E2E=PASS ops_session invite consent invited_identity onboarding drawing_zero foundation cross_domain_evidence capstone revisit alpha_gate complete_resume complete_heartbeat feedback_csrf feedback cohort_activation cohort_completion cohort_rating tester_detail graduation_projection");
