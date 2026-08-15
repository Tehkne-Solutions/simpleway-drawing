import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Next build embeds immutable release SHA and ref from GitHub or Vercel metadata", () => {
  const config = source("next.config.ts");
  assert.match(config, /process\.env\.GITHUB_SHA/);
  assert.match(config, /process\.env\.VERCEL_GIT_COMMIT_SHA/);
  assert.match(config, /process\.env\.GITHUB_REF_NAME/);
  assert.match(config, /process\.env\.VERCEL_GIT_COMMIT_REF/);
  assert.match(config, /SWD_RELEASE_SHA: releaseSha/);
  assert.match(config, /SWD_RELEASE_REF: releaseRef/);
});

test("health exposes release identity without changing readiness semantics", () => {
  const health = source("app/api/health/route.ts");
  assert.match(health, /service: "simpleway-drawing-web"/);
  assert.match(health, /release: \{/);
  assert.match(health, /sha: process\.env\.SWD_RELEASE_SHA \?\? "unknown"/);
  assert.match(health, /ref: process\.env\.SWD_RELEASE_REF \?\? "unknown"/);
  assert.match(health, /"cache-control": "no-store"/);
});

test("release identity helper rejects missing, stale SHA and wrong refs", () => {
  const helper = source("scripts/release-identity.mjs");
  assert.match(helper, /RELEASE_IDENTITY_MISSING/);
  assert.match(helper, /RELEASE_SHA_MISMATCH/);
  assert.match(helper, /RELEASE_REF_MISMATCH/);
  assert.match(helper, /EXPECTED_RELEASE_SHA/);
  assert.match(helper, /EXPECTED_RELEASE_REF/);
  assert.match(helper, /actual\.sha\.toLowerCase\(\)\.startsWith/);
});

test("Production Launch Gate checks release identity before infrastructure readiness", () => {
  const gate = source("scripts/production-launch-gate.mjs");
  const releaseIndex = gate.indexOf('check("release-identity"');
  const readinessIndex = gate.indexOf('check("infrastructure-readiness"');
  assert.ok(releaseIndex >= 0, "release-identity check missing");
  assert.ok(readinessIndex > releaseIndex, "release identity must precede infrastructure readiness");
  assert.match(gate, /assertReleaseIdentity\(healthPayload, expectedRelease\)/);
  assert.match(gate, /EXPECTED_RELEASE_SHA=\$\{expectation\.sha\}/);
  assert.match(gate, /EXPECTED_RELEASE_REF=\$\{expectation\.ref\}/);
});

test("Remote Smoke rejects deployments that do not match the dispatched release", () => {
  const smoke = source("scripts/remote-smoke.mjs");
  assert.match(smoke, /assertReleaseIdentity\(healthPayload, expectedRelease\)/);
  assert.match(smoke, /ACTUAL_RELEASE_SHA=\$\{actualRelease\.sha\}/);
  assert.match(smoke, /ACTUAL_RELEASE_REF=\$\{actualRelease\.ref\}/);
});

test("GitHub release workflows bind gates and prebuilt output to the selected source commit", () => {
  const launch = source("../../.github/workflows/release-candidate.yml");
  const remote = source("../../.github/workflows/remote-smoke.yml");
  const prebuilt = source("../../.github/workflows/prebuilt-production.yml");
  assert.match(launch, /EXPECTED_RELEASE_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(launch, /EXPECTED_RELEASE_REF: main/);
  assert.match(launch, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(remote, /EXPECTED_RELEASE_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(remote, /EXPECTED_RELEASE_REF: \$\{\{ github\.ref_name \}\}/);
  assert.match(prebuilt, /SWD_RELEASE_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(prebuilt, /SWD_RELEASE_REF: main/);
});
