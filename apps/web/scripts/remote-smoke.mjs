const rawBaseUrl = process.env.DEPLOY_BASE_URL ?? process.argv[2];
if (!rawBaseUrl) {
  console.error("REMOTE_SMOKE requires DEPLOY_BASE_URL or a URL argument");
  process.exit(1);
}

const baseUrl = rawBaseUrl.replace(/\/$/, "");
const expectedOrigin = new URL(baseUrl).origin;

async function request(path, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "user-agent": "simpleway-drawing-remote-smoke/1",
    },
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const health = await request("/api/health");
assert(health.ok, `health failed: ${health.status}`);
assert(health.headers.get("x-content-type-options") === "nosniff", "security headers missing");
assert(Boolean(health.headers.get("x-request-id")), "request id missing");

const ready = await request("/api/ready");
assert(ready.ok, `readiness failed: ${ready.status}`);

const home = await request("/");
assert(home.ok, `home failed: ${home.status}`);

const session = await request("/api/session/guest", {
  method: "POST",
  headers: { origin: expectedOrigin },
});
assert(session.status === 201 || session.status === 200, `guest session failed: ${session.status}`);
const setCookie = session.headers.get("set-cookie");
assert(Boolean(setCookie), "guest session did not set a cookie");
const cookie = setCookie.split(";", 1)[0];

const diagnostics = await request("/api/diagnostics", {
  headers: { cookie },
});
assert(diagnostics.ok, `diagnostics failed: ${diagnostics.status}`);
assert((diagnostics.headers.get("cache-control") ?? "").includes("no-store"), "diagnostics must be no-store");
const payload = await diagnostics.json();
assert(Boolean(payload.activationStage), "diagnostics activationStage missing");

console.log(`REMOTE_SMOKE=PASS url=${baseUrl} activation=${payload.activationStage}`);
