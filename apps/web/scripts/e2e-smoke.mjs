import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const opsToken = process.env.ALPHA_OPS_TOKEN;
const consentVersion = "closed-alpha-v1";
assert.ok(opsToken, "ALPHA_OPS_TOKEN is required for E2E operations smoke");

async function waitForHealth() {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError ?? new Error("HEALTH_ENDPOINT_NOT_READY");
}

const health = await waitForHealth();
assert.equal(health.status, 200);
assert.equal(health.headers.get("x-content-type-options"), "nosniff");
assert.equal(health.headers.get("x-frame-options"), "DENY");
assert.ok(health.headers.get("x-request-id"));
assert.equal((await health.json()).status, "ok");

const ready = await fetch(`${baseUrl}/api/ready`, { cache: "no-store" });
assert.equal(ready.status, 200);
assert.equal((await ready.json()).status, "ready");

const privacy = await fetch(`${baseUrl}/privacy`, { cache: "no-store" });
assert.equal(privacy.status, 200);
assert.match(await privacy.text(), /Privacidade e dados do participante/);

const unauthenticatedExport = await fetch(`${baseUrl}/api/privacy/export`, { cache: "no-store" });
assert.equal(unauthenticatedExport.status, 401);

const blocked = await fetch(`${baseUrl}/api/session/guest`, { method: "POST", headers: { origin: "https://malicious.example" } });
assert.equal(blocked.status, 403);
assert.equal((await blocked.json()).code, "CROSS_ORIGIN_REQUEST_BLOCKED");

const guest = await fetch(`${baseUrl}/api/session/guest`, { method: "POST" });
assert.equal(guest.status, 201);
const guestPayload = await guest.json();
assert.match(guestPayload.userId, /^[0-9a-f-]{36}$/i);
const setCookie = guest.headers.get("set-cookie");
assert.ok(setCookie);
const cookie = setCookie.split(";", 1)[0];

const onboarding = await fetch(`${baseUrl}/api/onboarding`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ displayName: "Alpha Tester", preferredPath: "MANGA", experienceLevel: "NEW", primaryGoal: "CAREER", preferredTool: "BOTH" }),
});
assert.equal(onboarding.status, 200);
assert.equal((await onboarding.json()).next, "/drawing-zero");

const resume = await fetch(`${baseUrl}/api/resume`, { headers: { cookie }, cache: "no-store" });
assert.equal(resume.status, 200);
assert.equal((await resume.json()).activation.stage, "DRAWING_ZERO");

const heartbeat = await fetch(`${baseUrl}/api/activity/heartbeat`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ path: "/drawing-zero", metadata: { source: "ci-smoke" } }),
});
assert.equal(heartbeat.status, 200);
assert.equal((await heartbeat.json()).stage, "DRAWING_ZERO");

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZxkAAAAASUVORK5CYII=", "base64");
const prepareUpload = await fetch(`${baseUrl}/api/files/private-upload`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ mimeType: "image/png", byteSize: png.byteLength }),
});
assert.equal(prepareUpload.status, 201, `prepare upload failed: ${await prepareUpload.text()}`);
const uploadIntent = await prepareUpload.json();
assert.match(uploadIntent.fileAssetId, /^[0-9a-f-]{36}$/i);
assert.match(uploadIntent.storageKey, new RegExp(`^private/${guestPayload.userId}/artwork/`));
assert.match(uploadIntent.uploadUrl, /^http:\/\/127\.0\.0\.1:9000\//);

const directUpload = await fetch(uploadIntent.uploadUrl, {
  method: "PUT",
  headers: {
    "content-type": "image/png",
    "content-length": String(png.byteLength),
  },
  body: png,
});
assert.equal(directUpload.status, 200, `presigned app upload failed: ${directUpload.status} ${await directUpload.text()}`);

const confirmUpload = await fetch(`${baseUrl}/api/files/confirm`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: uploadIntent.fileAssetId }),
});
assert.equal(confirmUpload.status, 200, `confirm upload failed: ${await confirmUpload.text()}`);
assert.equal((await confirmUpload.json()).ready, true);

const blockedDrawingZero = await fetch(`${baseUrl}/api/drawing-zero`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json", origin: "https://malicious.example" },
  body: JSON.stringify({ fileAssetId: uploadIntent.fileAssetId, source: "UPLOAD" }),
});
assert.equal(blockedDrawingZero.status, 403);
assert.equal((await blockedDrawingZero.json()).code, "CROSS_ORIGIN_REQUEST_BLOCKED");

const drawingZero = await fetch(`${baseUrl}/api/drawing-zero`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: uploadIntent.fileAssetId, source: "UPLOAD" }),
});
assert.equal(drawingZero.status, 201, `Drawing Zero failed: ${await drawingZero.text()}`);
const drawingZeroPayload = await drawingZero.json();
assert.match(drawingZeroPayload.artworkId, /^[0-9a-f-]{36}$/i);
assert.equal(drawingZeroPayload.baselineOnly, true);
assert.equal(drawingZeroPayload.visibility, "PRIVATE");

const idempotentDrawingZero = await fetch(`${baseUrl}/api/drawing-zero`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: uploadIntent.fileAssetId, source: "UPLOAD" }),
});
assert.equal(idempotentDrawingZero.status, 201);
assert.equal((await idempotentDrawingZero.json()).artworkId, drawingZeroPayload.artworkId);

const resumeAfterDrawingZero = await fetch(`${baseUrl}/api/resume`, { headers: { cookie }, cache: "no-store" });
assert.equal(resumeAfterDrawingZero.status, 200);
assert.equal((await resumeAfterDrawingZero.json()).activation.stage, "FIRST_LESSON");

const journey = await fetch(`${baseUrl}/journey`, { headers: { cookie }, cache: "no-store" });
assert.equal(journey.status, 200);
const journeyHtml = await journey.text();
assert.match(journeyHtml, /Minha jornada começou/);
assert.match(journeyHtml, /baseline privado/i);

const unauthorizedOps = await fetch(`${baseUrl}/api/ops/alpha`, { cache: "no-store" });
assert.equal(unauthorizedOps.status, 401);

const ops = await fetch(`${baseUrl}/api/ops/alpha`, { headers: { authorization: `Bearer ${opsToken}` }, cache: "no-store" });
assert.equal(ops.status, 200);
assert.ok((await ops.json()).overview.totalTesters >= 1);

const invalidOpsSession = await fetch(`${baseUrl}/api/ops/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token: "invalid-token-that-is-long-enough-to-test" }),
});
assert.equal(invalidOpsSession.status, 401);

const validOpsSession = await fetch(`${baseUrl}/api/ops/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token: opsToken }),
});
assert.equal(validOpsSession.status, 200);
const opsSetCookie = validOpsSession.headers.get("set-cookie");
assert.ok(opsSetCookie);
const opsCookie = opsSetCookie.split(";", 1)[0];

const inviteCreate = await fetch(`${baseUrl}/api/ops/invites`, {
  method: "POST",
  headers: { cookie: opsCookie, "content-type": "application/json" },
  body: JSON.stringify({ label: "Invited Tester", maxUses: 1, expiresInDays: 7 }),
});
assert.equal(inviteCreate.status, 201);
const invitePayload = await inviteCreate.json();
assert.match(invitePayload.code, /^[A-Za-z0-9_-]{20,}$/);
assert.equal(invitePayload.invite.uses, 0);

const noConsent = await fetch(`${baseUrl}/api/invites/redeem`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ code: invitePayload.code }),
});
assert.equal(noConsent.status, 400);
const noConsentPayload = await noConsent.json();
assert.equal(noConsentPayload.code, "CONSENT_REQUIRED");
assert.equal(noConsentPayload.consentVersion, consentVersion);

const inviteBeforeConsent = await fetch(`${baseUrl}/api/ops/invites`, { headers: { cookie: opsCookie }, cache: "no-store" });
assert.equal((await inviteBeforeConsent.json()).invites[0].uses, 0);

const redeem = await fetch(`${baseUrl}/api/invites/redeem`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ code: invitePayload.code, consentAccepted: true, consentVersion }),
});
assert.equal(redeem.status, 201);
const redeemPayload = await redeem.json();
assert.equal(redeemPayload.inviteLabel, "Invited Tester");
assert.equal(redeemPayload.next, "/onboarding");
const invitedSetCookie = redeem.headers.get("set-cookie");
assert.ok(invitedSetCookie);
const invitedCookie = invitedSetCookie.split(";", 1)[0];

const participantExport = await fetch(`${baseUrl}/api/privacy/export`, { headers: { cookie: invitedCookie }, cache: "no-store" });
assert.equal(participantExport.status, 200);
assert.match(participantExport.headers.get("content-disposition") ?? "", /attachment/);
const exportPayload = await participantExport.json();
assert.equal(exportPayload.exportVersion, "closed-alpha-data-export-v1");
assert.equal(exportPayload.userId, redeemPayload.userId);
assert.equal(exportPayload.operationalSummary.cohortLabel, "Invited Tester");

const reused = await fetch(`${baseUrl}/api/invites/redeem`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ code: invitePayload.code, consentAccepted: true, consentVersion }),
});
assert.equal(reused.status, 410);

const inviteList = await fetch(`${baseUrl}/api/ops/invites`, { headers: { cookie: opsCookie }, cache: "no-store" });
assert.equal(inviteList.status, 200);
const inviteListPayload = await inviteList.json();
assert.equal(inviteListPayload.invites[0].status, "CONSUMED");
assert.equal(inviteListPayload.invites[0].uses, 1);

const cohorts = await fetch(`${baseUrl}/api/ops/cohorts`, { headers: { cookie: opsCookie }, cache: "no-store" });
assert.equal(cohorts.status, 200);
const cohortPayload = await cohorts.json();
const invitedCohort = cohortPayload.cohorts.find((item) => item.label === "Invited Tester");
assert.ok(invitedCohort);
assert.equal(invitedCohort.redeemed, 1);
assert.equal(invitedCohort.onboarded, 0);

const interventions = await fetch(`${baseUrl}/api/ops/interventions`, { headers: { cookie: opsCookie }, cache: "no-store" });
assert.equal(interventions.status, 200);
const interventionPayload = await interventions.json();
const invitedRisk = interventionPayload.interventions.find((item) => item.userId === redeemPayload.userId);
assert.ok(invitedRisk);
assert.ok(invitedRisk.reasons.includes("NO_PROGRESS"));

const testerDetail = await fetch(`${baseUrl}/api/ops/testers/${redeemPayload.userId}`, { headers: { cookie: opsCookie }, cache: "no-store" });
assert.equal(testerDetail.status, 200);
const testerPayload = await testerDetail.json();
assert.equal(testerPayload.tester.cohortLabel, "Invited Tester");
assert.equal(testerPayload.tester.sessionCount, 1);

const testerPage = await fetch(`${baseUrl}/ops/testers/${redeemPayload.userId}`, { headers: { cookie: opsCookie }, redirect: "manual" });
assert.equal(testerPage.status, 200);
assert.match(await testerPage.text(), /Visão operacional mínima/);

const controlCenter = await fetch(`${baseUrl}/ops`, { headers: { cookie: opsCookie }, redirect: "manual" });
assert.equal(controlCenter.status, 200);
const controlHtml = await controlCenter.text();
assert.match(controlHtml, /Control Center/);
assert.match(controlHtml, /Cohort analytics/);
assert.match(controlHtml, /Intervention queue/);
assert.match(controlHtml, /NO_PROGRESS/);

const diagnostics = await fetch(`${baseUrl}/api/diagnostics`, { headers: { cookie }, cache: "no-store" });
assert.equal(diagnostics.status, 200);
const diagnosticsPayload = await diagnostics.json();
assert.ok(diagnosticsPayload.diagnostics);
assert.equal(diagnosticsPayload.diagnostics.hasBaseline, true);

console.log("E2E_SMOKE=PASS health readiness privacy_notice participant_export security_headers request_id csrf_guard database_session personalized_onboarding resume_projection tester_heartbeat app_upload_prepare presigned_put app_upload_confirm drawing_zero_csrf drawing_zero_submit drawing_zero_idempotency journey_baseline protected_ops ops_control_center consent_gate consent_atomicity invite_create invite_redeem invite_one_time cohort_analytics intervention_queue tester_detail private_diagnostics");
