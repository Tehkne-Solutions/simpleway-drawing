import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

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
const healthPayload = await health.json();
assert.equal(healthPayload.status, "ok");

const blocked = await fetch(`${baseUrl}/api/session/guest`, {
  method: "POST",
  headers: { origin: "https://malicious.example" },
});
assert.equal(blocked.status, 403);
const blockedPayload = await blocked.json();
assert.equal(blockedPayload.code, "CROSS_ORIGIN_REQUEST_BLOCKED");
assert.ok(blocked.headers.get("x-request-id"));

console.log("E2E_SMOKE=PASS health security_headers request_id csrf_guard");
