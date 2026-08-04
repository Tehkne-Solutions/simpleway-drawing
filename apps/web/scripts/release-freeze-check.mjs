import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");

const requiredFiles = [
  "vercel.json",
  ".github/workflows/ci.yml",
  ".github/workflows/release-candidate.yml",
  "docs/releases/RC1.md",
  "apps/web/server/cohort-readiness.ts",
  "apps/web/scripts/remote-smoke.mjs",
  "apps/web/scripts/cohort-completion-smoke.mjs",
  "apps/web/scripts/first-cohort-launch-smoke.mjs",
  "packages/database/migrations/0000_foundation_alpha.sql",
];

for (const relativePath of requiredFiles) {
  await access(resolve(repoRoot, relativePath));
}

const rootPackage = JSON.parse(await readFile(resolve(repoRoot, "package.json"), "utf8"));
const webPackage = JSON.parse(await readFile(resolve(repoRoot, "apps/web/package.json"), "utf8"));
const vercel = JSON.parse(await readFile(resolve(repoRoot, "vercel.json"), "utf8"));
const ci = await readFile(resolve(repoRoot, ".github/workflows/ci.yml"), "utf8");
const releaseWorkflow = await readFile(resolve(repoRoot, ".github/workflows/release-candidate.yml"), "utf8");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(rootPackage.packageManager === "pnpm@10.15.0", "packageManager must remain pinned to pnpm@10.15.0");
expect(rootPackage.engines?.node === "22.x", "Node must remain pinned to 22.x");
expect(webPackage.scripts?.["deploy:smoke"] === "node scripts/remote-smoke.mjs", "deploy:smoke contract changed");
expect(webPackage.scripts?.["e2e:first-cohort"] === "node scripts/first-cohort-launch-smoke.mjs", "first cohort E2E contract changed");
expect(vercel.installCommand === "npm install -g pnpm@10.15.0 && pnpm install --no-frozen-lockfile", "Vercel install command drifted");
expect(vercel.buildCommand === "pnpm build", "Vercel build command drifted");

for (const marker of ["pnpm typecheck", "pnpm content:validate", "pnpm test", "pnpm db:migrate", "pnpm deploy:check", "pnpm build", "e2e:cohort", "e2e:first-cohort"]) {
  expect(ci.includes(marker), `CI contract missing: ${marker}`);
}

expect(releaseWorkflow.includes("workflow_dispatch"), "Release Candidate workflow must remain manually dispatchable");
expect(releaseWorkflow.includes("apps/web/scripts/remote-smoke.mjs"), "Release Candidate workflow must execute the remote smoke gate");
expect(releaseWorkflow.includes("node-version: 22"), "Release Candidate workflow must remain pinned to Node 22");

if (failures.length) {
  console.error(`RELEASE_FREEZE=FAIL count=${failures.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`RELEASE_FREEZE=PASS required_files=${requiredFiles.length} node=22.x pnpm=10.15.0 rc=RC1`);
