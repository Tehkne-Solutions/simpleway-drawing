const rawBaseUrl = process.env.DEPLOY_BASE_URL ?? process.argv[2];
if (!rawBaseUrl) {
  console.error("REMOTE_SMOKE requires DEPLOY_BASE_URL or a URL argument");
  process.exit(1);
}

const baseUrl = rawBaseUrl.replace(/\/$/, "");
const target = new URL(baseUrl);
const expectedOrigin = target.origin;
const allowHttp = process.env.REMOTE_SMOKE_ALLOW_HTTP === "1";

if (!allowHttp && target.protocol !== "https:") {
  console.error("REMOTE_SMOKE requires HTTPS unless REMOTE_SMOKE_ALLOW_HTTP=1");
  process.exit(1);
}

async function request(path, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    cache: "no-store",
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "user-agent": "simpleway-drawing-release-gate/3",
    },
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoStore(response, label) {
  assert((response.headers.get("cache-control") ?? "").includes("no-store"), `${label} must be no-store`);
}

const health = await request("/api/health");
assert(health.ok, `health failed: ${health.status}`);
assertNoStore(health, "health");
assert(health.headers.get("x-content-type-options") === "nosniff", "security headers missing");
assert(Boolean(health.headers.get("x-request-id")), "request id missing");
const healthPayload = await health.json();
assert(healthPayload.status === "ok", "health status is not ok");
assert(healthPayload.service === "simpleway-drawing-web", "unexpected health service");

const ready = await request("/api/ready");
assert(ready.ok, `readiness failed: ${ready.status}`);
assertNoStore(ready, "readiness");
const readyPayload = await ready.json();
assert(readyPayload.status === "ready", "readiness status is not ready");
assert(readyPayload.database === "ok", "database readiness is not ok");
assert(readyPayload.storage === "ok", "private storage readiness is not ok");

const home = await request("/");
assert(home.ok, `home failed: ${home.status}`);
const homeHtml = await home.text();
assert(/SimpleWay/.test(homeHtml) && /Drawing/.test(homeHtml), "home product identity missing");
assert(/Tehkn[eé] Solutions/i.test(homeHtml), "Tehkné Solutions signature missing");

const privacy = await request("/privacy");
assert(privacy.ok, `privacy page failed: ${privacy.status}`);
assert(/privacidade|dados/i.test(await privacy.text()), "privacy notice content missing");

const unauthorizedOps = await request("/api/ops/alpha");
assert(unauthorizedOps.status === 401, `ops endpoint must reject anonymous access: ${unauthorizedOps.status}`);

const session = await request("/api/session/guest", {
  method: "POST",
  headers: { origin: expectedOrigin },
});
assert(session.status === 201 || session.status === 200, `guest session failed: ${session.status}`);
const setCookie = session.headers.get("set-cookie");
assert(Boolean(setCookie), "guest session did not set a cookie");
const cookie = setCookie.split(";", 1)[0];

if (!allowHttp) {
  assert(/^__Host-swd_session=/.test(setCookie), "production session must use __Host-swd_session");
  assert(/;\s*Secure(?:;|$)/i.test(setCookie), "production session cookie must be Secure");
  assert(/;\s*HttpOnly(?:;|$)/i.test(setCookie), "production session cookie must be HttpOnly");
  assert(/;\s*SameSite=Lax(?:;|$)/i.test(setCookie), "production session cookie must use SameSite=Lax");
  assert(/;\s*Path=\/(?:;|$)/i.test(setCookie), "production session cookie must use Path=/");
  assert(!/;\s*Domain=/i.test(setCookie), "__Host- cookie must not set Domain");
}

const resume = await request("/api/resume", { headers: { cookie } });
assert(resume.ok, `resume failed: ${resume.status}`);
assertNoStore(resume, "resume");
const resumePayload = await resume.json();
assert(resumePayload.activation?.stage === "ONBOARDING", `unexpected initial activation stage: ${resumePayload.activation?.stage}`);
assert(resumePayload.activation?.nextAction?.href === "/onboarding", "initial resume action must point to onboarding");

const diagnostics = await request("/api/diagnostics", { headers: { cookie } });
assert(diagnostics.ok, `diagnostics failed: ${diagnostics.status}`);
assertNoStore(diagnostics, "diagnostics");
const diagnosticsPayload = await diagnostics.json();
assert(diagnosticsPayload.activationStage === "ONBOARDING", `unexpected diagnostics activation stage: ${diagnosticsPayload.activationStage}`);

const privacyExport = await request("/api/privacy/export", { headers: { cookie } });
assert(privacyExport.ok, `privacy export failed: ${privacyExport.status}`);
assert((privacyExport.headers.get("content-disposition") ?? "").includes("attachment"), "privacy export must be an attachment");
assertNoStore(privacyExport, "privacy export");
const exportPayload = await privacyExport.json();
assert(exportPayload.exportVersion === "closed-alpha-data-export-v1", "unexpected privacy export version");
assert(Boolean(exportPayload.userId), "privacy export userId missing");

const blockedFeedback = await request("/api/feedback", {
  method: "POST",
  headers: {
    cookie,
    origin: "https://cross-origin.invalid",
    "content-type": "application/json",
  },
  body: JSON.stringify({ category: "OTHER", rating: 5, message: "release gate must block this", path: "/" }),
});
assert(blockedFeedback.status === 403, `cross-origin mutation was not blocked: ${blockedFeedback.status}`);
assert((await blockedFeedback.json()).code === "CROSS_ORIGIN_REQUEST_BLOCKED", "unexpected cross-origin rejection code");

console.log(`REMOTE_RELEASE_GATE=PASS url=${baseUrl} health ready database storage headers home signature privacy ops_guard secure_cookie resume diagnostics privacy_export csrf`);
