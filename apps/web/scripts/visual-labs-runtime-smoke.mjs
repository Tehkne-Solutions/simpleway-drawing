import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

async function createSession() {
  const response = await fetch(`${baseUrl}/api/session/guest`, { method: "POST" });
  await assertHttp(response, 201, "visual labs guest session");
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie);
  return setCookie.split(";", 1)[0];
}

const cookie = await createSession();

const observationCatalog = await fetch(`${baseUrl}/api/observation`, { cache: "no-store" });
await assertHttp(observationCatalog, 200, "observation catalog");
const catalogPayload = await observationCatalog.json();
assert.ok(catalogPayload.exercises.some((item) => item.key === "exercise.swd.observation.ratio_match"));

const observationCsrf = await fetch(`${baseUrl}/api/observation`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.observation.ratio_match", answerIndex: 2, responseMs: 1400 }),
});
assert.equal(observationCsrf.status, 403);
assert.equal((await observationCsrf.json()).code, "CROSS_ORIGIN_REQUEST_BLOCKED");

const observation = await fetch(`${baseUrl}/api/observation`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.observation.ratio_match", answerIndex: 2, responseMs: 1400 }),
});
await assertHttp(observation, 200, "observation submission");
const observationPayload = await observation.json();
assert.equal(observationPayload.correct, true);
assert.equal(observationPayload.correctIndex, 2);
assert.equal(observationPayload.skillKey, "skill.drawing.perception.proportion");
assert.equal(observationPayload.evidenceCount, 1);
assert.match(observationPayload.attemptId, /^[0-9a-f-]{36}$/i);
assert.match(observationPayload.evidenceId, /^[0-9a-f-]{36}$/i);

const observationRepeat = await fetch(`${baseUrl}/api/observation`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.observation.ratio_match", answerIndex: 0, responseMs: 4300 }),
});
await assertHttp(observationRepeat, 200, "observation repeated evidence");
const observationRepeatPayload = await observationRepeat.json();
assert.equal(observationRepeatPayload.correct, false);
assert.equal(observationRepeatPayload.evidenceCount, 2);

const constructionCsrf = await fetch(`${baseUrl}/api/construction`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.construction.decomposition", answerIndex: 1 }),
});
assert.equal(constructionCsrf.status, 403);

const construction = await fetch(`${baseUrl}/api/construction`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.construction.decomposition", answerIndex: 1 }),
});
await assertHttp(construction, 200, "construction submission");
const constructionPayload = await construction.json();
assert.equal(constructionPayload.correct, true);
assert.equal(constructionPayload.skillKey, "skill.drawing.shape.decomposition");
assert.equal(constructionPayload.evidenceCount, 1);
assert.match(constructionPayload.evidenceId, /^[0-9a-f-]{36}$/i);

const invalidConstruction = await fetch(`${baseUrl}/api/construction`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.construction.decomposition", answerIndex: 99 }),
});
assert.equal(invalidConstruction.status, 400);
assert.equal((await invalidConstruction.json()).code, "INVALID_CONSTRUCTION_ANSWER");

const formCsrf = await fetch(`${baseUrl}/api/form`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.form.box_orientation", answerIndex: 1 }),
});
assert.equal(formCsrf.status, 403);

const form = await fetch(`${baseUrl}/api/form`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.form.box_orientation", answerIndex: 1 }),
});
await assertHttp(form, 200, "form submission");
const formPayload = await form.json();
assert.equal(formPayload.correct, true);
assert.equal(formPayload.skillKey, "skill.drawing.form.box");
assert.equal(formPayload.evidenceCount, 1);
assert.match(formPayload.evidenceId, /^[0-9a-f-]{36}$/i);

const unsupportedForm = await fetch(`${baseUrl}/api/form`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ exerciseKey: "exercise.swd.form.unknown", answerIndex: 1 }),
});
assert.equal(unsupportedForm.status, 400);
assert.equal((await unsupportedForm.json()).code, "FORM_EXERCISE_NOT_SUPPORTED");

for (const [path, label] of [["/observation", "Observation Lab"], ["/construction", "Construction Lab"], ["/form", "Form Lab"]]) {
  const page = await fetch(`${baseUrl}${path}`, { headers: { cookie }, cache: "no-store" });
  await assertHttp(page, 200, `${label} page`);
}

const skills = await fetch(`${baseUrl}/skills`, { headers: { cookie }, cache: "no-store" });
await assertHttp(skills, 200, "cross-lab skill profile");
const skillHtml = await skills.text();
assert.match(skillHtml, /Evidências dos Labs/);
assert.match(skillHtml, /Proporção visual/);
assert.match(skillHtml, /Decomposição estrutural/);
assert.match(skillHtml, /Construção de caixas/);

const diagnostics = await fetch(`${baseUrl}/api/diagnostics`, { headers: { cookie }, cache: "no-store" });
await assertHttp(diagnostics, 200, "visual labs diagnostics");
assert.ok((await diagnostics.json()).diagnostics);

console.log("VISUAL_LABS_E2E=PASS observation_catalog observation_csrf perceptual_evidence repeated_perceptual_evidence construction_csrf structural_evidence invalid_answer form_csrf spatial_evidence unsupported_exercise lab_pages cross_lab_skill_profile diagnostics_projection");
