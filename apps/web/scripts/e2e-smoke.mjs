import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const opsToken = process.env.ALPHA_OPS_TOKEN;
const consentVersion = "closed-alpha-v1";
assert.ok(opsToken, "ALPHA_OPS_TOKEN is required for E2E operations smoke");

async function assertHttp(response, expectedStatus, label) {
  if (response.status !== expectedStatus) {
    throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
  }
}

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
const readyPayload = await ready.json();
assert.equal(readyPayload.status, "ready");
assert.equal(readyPayload.database, "ok");
assert.equal(readyPayload.storage, "ok");

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
await assertHttp(prepareUpload, 201, "prepare upload");
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
await assertHttp(directUpload, 200, "presigned app upload");

const confirmUpload = await fetch(`${baseUrl}/api/files/confirm`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: uploadIntent.fileAssetId }),
});
await assertHttp(confirmUpload, 200, "confirm upload");
const confirmed = await confirmUpload.json();
assert.equal(confirmed.status, "READY");

const drawingZero = await fetch(`${baseUrl}/api/drawing-zero`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ fileAssetId: uploadIntent.fileAssetId }),
});
assert.equal(drawingZero.status, 200);

const journey = await fetch(`${baseUrl}/journey`, { headers: { cookie }, cache: "no-store" });
assert.equal(journey.status, 200);
assert.match(await journey.text(), /Drawing Zero/);

const opsLogin = await fetch(`${baseUrl}/api/ops/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token: opsToken }),
});
assert.equal(opsLogin.status, 200);
const opsSetCookie = opsLogin.headers.get("set-cookie");
assert.ok(opsSetCookie);
const opsCookie = opsSetCookie.split(";", 1)[0];

const ops = await fetch(`${baseUrl}/ops`, { headers: { cookie: opsCookie }, cache: "no-store" });
assert.equal(ops.status, 200);
assert.match(await ops.text(), /Control Center/);

console.log("E2E_SMOKE=PASS health readiness(database+storage) privacy csrf session onboarding upload drawing_zero journey ops");
