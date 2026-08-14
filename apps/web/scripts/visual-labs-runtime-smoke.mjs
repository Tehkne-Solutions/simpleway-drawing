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

function validPixelArtifact() {
  const resolution = 16;
  const pixels = Array.from({ length: resolution * resolution }, () => null);
  for (let y = 4; y < 12; y += 1) {
    for (let x = 4; x < 12; x += 1) {
      pixels[y * resolution + x] = (x + y) % 2 === 0 ? "#181715" : "#f2b705";
    }
  }
  return { missionId: "pixel", payload: { resolution, pixels } };
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

const creativeCsrf = await fetch(`${baseUrl}/api/pixel/expedition`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify(validPixelArtifact()),
});
assert.equal(creativeCsrf.status, 403);
assert.equal((await creativeCsrf.json()).code, "CROSS_ORIGIN_REQUEST_BLOCKED");

const invalidCreative = await fetch(`${baseUrl}/api/pixel/expedition`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ missionId: "pixel", payload: { complete: true } }),
});
assert.equal(invalidCreative.status, 400);
assert.equal((await invalidCreative.json()).code, "INVALID_PIXEL_RESOLUTION");

const creative = await fetch(`${baseUrl}/api/pixel/expedition`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify(validPixelArtifact()),
});
await assertHttp(creative, 201, "pixel creative evidence submission");
const creativePayload = await creative.json();
assert.equal(creativePayload.created, true);
assert.equal(creativePayload.missionId, "pixel");
assert.deepEqual(creativePayload.snapshot.completedMissionIds, ["pixel"]);
assert.equal(creativePayload.snapshot.completedCount, 1);
assert.equal(creativePayload.snapshot.xp, 125);
assert.equal(creativePayload.snapshot.complete, false);
assert.equal(creativePayload.snapshot.evidence.find((item) => item.missionId === "pixel")?.evidenceCount, 1);

const creativeRepeat = await fetch(`${baseUrl}/api/pixel/expedition`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify(validPixelArtifact()),
});
await assertHttp(creativeRepeat, 200, "pixel creative evidence idempotency");
const creativeRepeatPayload = await creativeRepeat.json();
assert.equal(creativeRepeatPayload.created, false);
assert.equal(creativeRepeatPayload.snapshot.completedCount, 1);
assert.equal(creativeRepeatPayload.snapshot.evidence.find((item) => item.missionId === "pixel")?.evidenceCount, 1);

const creativeSnapshot = await fetch(`${baseUrl}/api/pixel/expedition`, { headers: { cookie }, cache: "no-store" });
await assertHttp(creativeSnapshot, 200, "pixel expedition snapshot");
const creativeSnapshotPayload = await creativeSnapshot.json();
assert.deepEqual(creativeSnapshotPayload.completedMissionIds, ["pixel"]);
assert.equal(creativeSnapshotPayload.xp, 125);

const skills = await fetch(`${baseUrl}/skills`, { headers: { cookie }, cache: "no-store" });
await assertHttp(skills, 200, "cross-lab skill profile");
const skillHtml = await skills.text();
assert.match(skillHtml, /Evidence dos Labs &amp; Ateliers|Evidence dos Labs & Ateliers/);
assert.match(skillHtml, /Proporção visual/);
assert.match(skillHtml, /Decomposição estrutural/);
assert.match(skillHtml, /Construção de caixas/);
assert.match(skillHtml, /Síntese em Pixel Art/);

const journey = await fetch(`${baseUrl}/journey`, { headers: { cookie }, cache: "no-store" });
await assertHttp(journey, 200, "creative evidence atlas projection");
const journeyHtml = await journey.text();
assert.match(journeyHtml, /Olho de Croma/);
assert.match(journeyHtml, /Sigilo da Forma/);

const diagnostics = await fetch(`${baseUrl}/api/diagnostics`, { headers: { cookie }, cache: "no-store" });
await assertHttp(diagnostics, 200, "visual labs diagnostics");
assert.ok((await diagnostics.json()).diagnostics);

console.log("VISUAL_LABS_E2E=PASS observation_catalog observation_csrf perceptual_evidence repeated_perceptual_evidence construction_csrf structural_evidence invalid_answer form_csrf spatial_evidence unsupported_exercise lab_pages creative_csrf creative_artifact_validation creative_evidence creative_idempotency creative_snapshot cross_lab_atelier_skill_profile creative_atlas_projection diagnostics_projection");
