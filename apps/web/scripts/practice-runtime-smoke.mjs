import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

async function createSession() {
  const response = await fetch(`${baseUrl}/api/session/guest`, { method: "POST" });
  await assertHttp(response, 201, "practice guest session");
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie);
  return setCookie.split(";", 1)[0];
}

const cookie = await createSession();

const crossOrigin = await fetch(`${baseUrl}/api/gym/intentional-line`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify({ accuracy: 0.9, smoothness: 0.85, durationMs: 900, pointCount: 30 }),
});
assert.equal(crossOrigin.status, 403);
assert.equal((await crossOrigin.json()).code, "CROSS_ORIGIN_REQUEST_BLOCKED");

const invalid = await fetch(`${baseUrl}/api/gym/intentional-line`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ accuracy: 2, smoothness: 0.85, durationMs: 900, pointCount: 30 }),
});
assert.equal(invalid.status, 400);
assert.equal((await invalid.json()).code, "INVALID_GYM_METRICS");

const firstLine = await fetch(`${baseUrl}/api/gym/intentional-line`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ accuracy: 0.92, smoothness: 0.88, durationMs: 910, pointCount: 32 }),
});
await assertHttp(firstLine, 200, "first intentional line");
const firstPayload = await firstLine.json();
assert.match(firstPayload.attemptId, /^[0-9a-f-]{36}$/i);
assert.match(firstPayload.evidenceId, /^[0-9a-f-]{36}$/i);
assert.equal(firstPayload.exerciseKey, "exercise.swd.gym.intentional_line");
assert.equal(firstPayload.skillKey, "skill.drawing.motor.line_control");
assert.equal(firstPayload.evidenceCount, 1);
assert.ok(firstPayload.score > 0.8 && firstPayload.score <= 1);
assert.ok(firstPayload.masteryScore > 0 && firstPayload.masteryScore <= 1);
assert.equal(typeof firstPayload.coach.headline, "string");

const secondLine = await fetch(`${baseUrl}/api/gym/intentional-line`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ accuracy: 0.78, smoothness: 0.74, durationMs: 1200, pointCount: 28 }),
});
await assertHttp(secondLine, 200, "second intentional line");
const secondPayload = await secondLine.json();
assert.equal(secondPayload.evidenceCount, 2);
assert.equal(secondPayload.skillKey, firstPayload.skillKey);
assert.notEqual(secondPayload.evidenceId, firstPayload.evidenceId);

const curve = await fetch(`${baseUrl}/api/gym/motor-drill`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.gym.curve_path", accuracy: 0.84, smoothness: 0.91, durationMs: 1300, pointCount: 36 }),
});
await assertHttp(curve, 200, "curve motor drill");
const curvePayload = await curve.json();
assert.equal(curvePayload.exerciseKey, "exercise.swd.gym.curve_path");
assert.equal(curvePayload.skillKey, "skill.drawing.motor.curve_c");
assert.equal(curvePayload.evidenceCount, 1);

const unsupported = await fetch(`${baseUrl}/api/gym/motor-drill`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.gym.unknown", accuracy: 0.8, smoothness: 0.8, durationMs: 900, pointCount: 20 }),
});
assert.equal(unsupported.status, 400);
assert.equal((await unsupported.json()).code, "GYM_EXERCISE_NOT_SUPPORTED");

const skills = await fetch(`${baseUrl}/skills`, { headers: { cookie }, cache: "no-store" });
await assertHttp(skills, 200, "skill profile projection");
const skillsHtml = await skills.text();
assert.match(skillsHtml, /Controle de linha/);
assert.match(skillsHtml, /Controle de curva/);

const diagnostics = await fetch(`${baseUrl}/api/diagnostics`, { headers: { cookie }, cache: "no-store" });
await assertHttp(diagnostics, 200, "practice diagnostics");
const diagnosticsPayload = await diagnostics.json();
assert.ok(diagnosticsPayload.diagnostics);

console.log("PRACTICE_RUNTIME_E2E=PASS gym_csrf metric_validation intentional_line_attempt evidence_persistence mastery_update repeated_evidence motor_drill unsupported_exercise skill_profile_projection diagnostics_projection");
