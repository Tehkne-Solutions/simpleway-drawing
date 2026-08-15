import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Vercel protection helper uses the official automation bypass contract without logging the secret", () => {
  const helper = source("scripts/vercel-protection.mjs");
  assert.match(helper, /VERCEL_AUTOMATION_BYPASS_SECRET/);
  assert.match(helper, /"x-vercel-protection-bypass": value/);
  assert.match(helper, /"x-vercel-set-bypass-cookie": "true"/);
  assert.match(helper, /VERCEL_DEPLOYMENT_PROTECTED_SSO/);
  assert.match(helper, /VERCEL_DEPLOYMENT_PROTECTED_AUTH/);
  assert.match(helper, /protectionBypassStatus/);
  assert.doesNotMatch(helper, /console\.log\([^\n]*secret/i);
});

test("Production Launch Gate distinguishes platform protection before app readiness", () => {
  const gate = source("scripts/production-launch-gate.mjs");
  assert.match(gate, /from "\.\/vercel-protection\.mjs"/);
  assert.match(gate, /check\("platform-access"/);
  assert.match(gate, /deploymentProtectionCode\(response\)/);
  assert.match(gate, /assertDeploymentAccessible\(response, "production URL"\)/);
  assert.match(gate, /if \(platformAccessible\)/);
  assert.match(gate, /VERCEL_AUTOMATION_BYPASS=\$\{protectionBypassStatus\(\)\}/);
});

test("Remote Smoke uses the same fail-closed Vercel protection contract", () => {
  const smoke = source("scripts/remote-smoke.mjs");
  assert.match(smoke, /from "\.\/vercel-protection\.mjs"/);
  assert.match(smoke, /\.\.\.protectionHeaders/);
  assert.match(smoke, /assertDeploymentAccessible\(response, path\)/);
  assert.match(smoke, /VERCEL_AUTOMATION_BYPASS=\$\{protectionBypassStatus\(\)\}/);
});

test("Production workflows pass automation bypass only through GitHub Secrets", () => {
  const launch = source("../../.github/workflows/release-candidate.yml");
  const remote = source("../../.github/workflows/remote-smoke.yml");
  for (const workflow of [launch, remote]) {
    assert.match(workflow, /VERCEL_AUTOMATION_BYPASS_SECRET: \$\{\{ secrets\.VERCEL_AUTOMATION_BYPASS_SECRET \}\}/);
    assert.doesNotMatch(workflow, /x-vercel-protection-bypass:/);
  }
});
