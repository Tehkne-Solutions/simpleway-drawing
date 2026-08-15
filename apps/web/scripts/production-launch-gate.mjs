import {
  assertDeploymentAccessible,
  deploymentProtectionCode,
  protectionBypassStatus,
  vercelProtectionHeaders,
} from "./vercel-protection.mjs";
import {
  assertReleaseIdentity,
  expectedReleaseIdentity,
  releaseExpectationStatus,
} from "./release-identity.mjs";

const rawBaseUrl = process.env.DEPLOY_BASE_URL ?? process.argv[2];
if (!rawBaseUrl) {
  console.error("PRODUCTION_LAUNCH_GATE requires DEPLOY_BASE_URL or a URL argument");
  process.exit(1);
}

const baseUrl = rawBaseUrl.replace(/\/$/, "");
const target = new URL(baseUrl);
if (target.protocol !== "https:") {
  console.error("PRODUCTION_LAUNCH_GATE requires an HTTPS production URL");
  process.exit(1);
}

const origin = target.origin;
const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });
const protectionHeaders = vercelProtectionHeaders();
const expectedRelease = expectedReleaseIdentity();
const request = (path, init = {}) => fetch(`${baseUrl}${path}`, {
  redirect: "manual",
  cache: "no-store",
  ...init,
  headers: {
    ...protectionHeaders,
    ...(init.headers ?? {}),
    "user-agent": "simpleway-drawing-production-launch-gate/3",
  },
});

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail ?? "PASS");
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
  }
}

const expect = (condition, message) => { if (!condition) throw new Error(message); };
let sessionCookie = null;
let platformAccessible = true;
let healthPayload = null;

await check("platform-access", async () => {
  const response = await request("/api/health");
  const protectionCode = deploymentProtectionCode(response);
  if (protectionCode) {
    platformAccessible = false;
    assertDeploymentAccessible(response, "production URL");
  }
  return `edge reachable; automation bypass ${protectionBypassStatus().toLowerCase()}`;
});

if (platformAccessible) {
  await check("health", async () => {
    const response = await request("/api/health");
    expect(response.ok, `HTTP ${response.status}`);
    healthPayload = await response.json();
    expect(healthPayload.status === "ok" && healthPayload.service === "simpleway-drawing-web", "invalid health payload");
    expect((response.headers.get("cache-control") ?? "").includes("no-store"), "health cache policy is not no-store");
    expect(response.headers.get("x-content-type-options") === "nosniff", "security headers missing");
    expect(Boolean(response.headers.get("x-request-id")), "request id missing");
    return "service ok, security headers present";
  });

  await check("release-identity", async () => {
    expect(healthPayload, "health payload unavailable");
    const actual = assertReleaseIdentity(healthPayload, expectedRelease);
    return `sha=${actual.sha} ref=${actual.ref}`;
  });

  await check("infrastructure-readiness", async () => {
    const response = await request("/api/ready");
    expect(response.ok, `HTTP ${response.status}`);
    const body = await response.json();
    expect(body.status === "ready", "application is not ready");
    expect(body.database === "ok", "database is not ready");
    expect(body.storage === "ok", "private object storage is not ready");
    return "database and private storage ready";
  });

  await check("public-product", async () => {
    const response = await request("/");
    expect(response.ok, `HTTP ${response.status}`);
    const html = await response.text();
    expect(/SimpleWay/.test(html) && /Drawing/.test(html), "product identity missing");
    expect(/Tehkn[eé] Solutions/i.test(html), "Tehkné Solutions signature missing");
    return "identity and signature present";
  });

  await check("privacy", async () => {
    const response = await request("/privacy");
    expect(response.ok, `HTTP ${response.status}`);
    expect(/privacidade|dados/i.test(await response.text()), "privacy notice missing");
    return "privacy notice reachable";
  });

  await check("ops-guard", async () => {
    const response = await request("/api/ops/alpha");
    expect(response.status === 401, `anonymous Ops returned ${response.status}`);
    return "anonymous Ops access rejected";
  });

  await check("secure-session", async () => {
    const response = await request("/api/session/guest", { method: "POST", headers: { origin } });
    expect(response.status === 200 || response.status === 201, `HTTP ${response.status}`);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(/^__Host-swd_session=/.test(setCookie), "__Host session cookie missing");
    for (const marker of [/;\s*Secure(?:;|$)/i, /;\s*HttpOnly(?:;|$)/i, /;\s*SameSite=Lax(?:;|$)/i, /;\s*Path=\/(?:;|$)/i]) {
      expect(marker.test(setCookie), `cookie contract missing ${marker}`);
    }
    expect(!/;\s*Domain=/i.test(setCookie), "__Host cookie must not set Domain");
    sessionCookie = setCookie.split(";", 1)[0];
    return "secure __Host session created";
  });

  await check("learning-runtime", async () => {
    expect(sessionCookie, "session unavailable");
    const response = await request("/api/resume", { headers: { cookie: sessionCookie } });
    expect(response.ok, `HTTP ${response.status}`);
    const body = await response.json();
    expect(body.activation?.stage === "ONBOARDING", `unexpected stage ${body.activation?.stage}`);
    expect(body.activation?.nextAction?.href === "/onboarding", "initial action is not onboarding");
    return "new learner resolves to onboarding";
  });

  await check("diagnostics", async () => {
    expect(sessionCookie, "session unavailable");
    const response = await request("/api/diagnostics", { headers: { cookie: sessionCookie } });
    expect(response.ok, `HTTP ${response.status}`);
    const body = await response.json();
    expect(body.activationStage === "ONBOARDING", "diagnostics activation mismatch");
    return "diagnostics operational";
  });

  await check("privacy-export", async () => {
    expect(sessionCookie, "session unavailable");
    const response = await request("/api/privacy/export", { headers: { cookie: sessionCookie } });
    expect(response.ok, `HTTP ${response.status}`);
    expect((response.headers.get("content-disposition") ?? "").includes("attachment"), "export is not an attachment");
    const body = await response.json();
    expect(body.exportVersion === "closed-alpha-data-export-v1" && Boolean(body.userId), "privacy export contract mismatch");
    return "participant export operational";
  });

  await check("csrf", async () => {
    expect(sessionCookie, "session unavailable");
    const response = await request("/api/feedback", {
      method: "POST",
      headers: { cookie: sessionCookie, origin: "https://cross-origin.invalid", "content-type": "application/json" },
      body: JSON.stringify({ category: "OTHER", rating: 5, message: "production gate must reject this", path: "/" }),
    });
    expect(response.status === 403, `cross-origin mutation returned ${response.status}`);
    expect((await response.json()).code === "CROSS_ORIGIN_REQUEST_BLOCKED", "unexpected CSRF rejection code");
    return "cross-origin mutation rejected";
  });
}

const failed = results.filter((item) => !item.ok);
const expectation = releaseExpectationStatus(expectedRelease);
console.log("\nSimpleWay Drawing · Production Launch Gate");
console.log(`VERCEL_AUTOMATION_BYPASS=${protectionBypassStatus()}`);
console.log(`EXPECTED_RELEASE_SHA=${expectation.sha}`);
console.log(`EXPECTED_RELEASE_REF=${expectation.ref}`);
for (const item of results) console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}: ${item.detail}`);
console.log(`\nPRODUCTION_LAUNCH_GATE=${failed.length === 0 ? "GO" : "NO_GO"} url=${baseUrl} passed=${results.length - failed.length}/${results.length}`);
console.log("Tehkné Solutions");
if (failed.length) process.exit(1);
