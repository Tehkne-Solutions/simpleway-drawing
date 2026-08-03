import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const opsToken = process.env.ALPHA_OPS_TOKEN;
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

const redeem = await fetch(`${baseUrl}/api/invites/redeem`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ code: invitePayload.code }),
});
assert.equal(redeem.status, 201);
const redeemPayload = await redeem.json();
assert.equal(redeemPayload.inviteLabel, "Invited Tester");
assert.equal(redeemPayload.next, "/onboarding");
assert.ok(redeem.headers.get("set-cookie"));

const reused = await fetch(`${baseUrl}/api/invites/redeem`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ code: invitePayload.code }),
});
assert.equal(reused.status, 410);

const inviteList = await fetch(`${baseUrl}/api/ops/invites`, { headers: { cookie: opsCookie }, cache: "no-store" });
assert.equal(inviteList.status, 200);
const inviteListPayload = await inviteList.json();
assert.equal(inviteListPayload.invites[0].status, "CONSUMED");
assert.equal(inviteListPayload.invites[0].uses, 1);

const controlCenter = await fetch(`${baseUrl}/ops`, { headers: { cookie: opsCookie }, redirect: "manual" });
assert.equal(controlCenter.status, 200);
const controlHtml = await controlCenter.text();
assert.match(controlHtml, /Control Center/);
assert.match(controlHtml, /Alpha Tester/);

const diagnostics = await fetch(`${baseUrl}/api/diagnostics`, { headers: { cookie }, cache: "no-store" });
assert.equal(diagnostics.status, 200);
assert.ok((await diagnostics.json()).diagnostics);

console.log("E2E_SMOKE=PASS health readiness security_headers request_id csrf_guard database_session personalized_onboarding resume_projection tester_heartbeat protected_ops ops_control_center invite_create invite_redeem invite_one_time private_diagnostics");
