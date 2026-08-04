import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");

const requiredFiles = [
  "vercel.json",
  ".github/workflows/ci.yml",
  ".github/workflows/release-candidate.yml",
  "docs/releases/RC1.md",
  "apps/web/server/cohort-readiness.ts",
  "apps/web/server/launch-incidents.ts",
  "apps/web/scripts/production-launch-gate.mjs",
  "apps/web/scripts/remote-smoke.mjs",
  "apps/web/scripts/cohort-completion-smoke.mjs",
  "apps/web/scripts/first-cohort-launch-smoke.mjs",
  "apps/web/app/api/ops/interventions/route.ts",
  "apps/web/app/api/ops/incidents/route.ts",
  "apps/web/app/ops/InterventionActions.tsx",
  "apps/web/app/ops/incidents/page.tsx",
  "packages/database/src/repositories/operations.ts",
  "packages/database/migrations/0000_foundation_alpha.sql",
];

for (const relativePath of requiredFiles) await access(resolve(repoRoot, relativePath));

const rootPackage = JSON.parse(await readFile(resolve(repoRoot, "package.json"), "utf8"));
const webPackage = JSON.parse(await readFile(resolve(repoRoot, "apps/web/package.json"), "utf8"));
const databasePackage = JSON.parse(await readFile(resolve(repoRoot, "packages/database/package.json"), "utf8"));
const storagePackage = JSON.parse(await readFile(resolve(repoRoot, "packages/storage/package.json"), "utf8"));
const vercel = JSON.parse(await readFile(resolve(repoRoot, "vercel.json"), "utf8"));
const ci = await readFile(resolve(repoRoot, ".github/workflows/ci.yml"), "utf8");
const releaseWorkflow = await readFile(resolve(repoRoot, ".github/workflows/release-candidate.yml"), "utf8");
const interventionsRoute = await readFile(resolve(repoRoot, "apps/web/app/api/ops/interventions/route.ts"), "utf8");
const incidentsRoute = await readFile(resolve(repoRoot, "apps/web/app/api/ops/incidents/route.ts"), "utf8");
const launchIncidents = await readFile(resolve(repoRoot, "apps/web/server/launch-incidents.ts"), "utf8");
const operationsRepository = await readFile(resolve(repoRoot, "packages/database/src/repositories/operations.ts"), "utf8");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(rootPackage.packageManager === "pnpm@10.15.0", "packageManager must remain pinned to pnpm@10.15.0");
expect(rootPackage.engines?.node === "22.x", "Node must remain pinned to 22.x");
expect(Array.isArray(rootPackage.workspaces) && rootPackage.workspaces.includes("apps/*") && rootPackage.workspaces.includes("packages/*"), "npm workspace fallback must remain configured");
expect(webPackage.scripts?.["deploy:smoke"] === "node scripts/remote-smoke.mjs", "deploy:smoke contract changed");
expect(webPackage.scripts?.["e2e:first-cohort"] === "node scripts/first-cohort-launch-smoke.mjs", "first cohort E2E contract changed");

for (const [name, version] of Object.entries({
  "@swd/content": webPackage.dependencies?.["@swd/content"],
  "@swd/database": webPackage.dependencies?.["@swd/database"],
  "@swd/domain": webPackage.dependencies?.["@swd/domain"],
  "@swd/storage": webPackage.dependencies?.["@swd/storage"],
  "@swd/database→domain": databasePackage.dependencies?.["@swd/domain"],
  "@swd/database→config": databasePackage.devDependencies?.["@swd/config"],
  "@swd/storage→domain": storagePackage.dependencies?.["@swd/domain"],
})) {
  expect(version === "0.0.0", `${name} must use npm-compatible local version 0.0.0`);
}

expect(vercel.framework === "nextjs", "Vercel framework must remain nextjs");
expect(vercel.installCommand === "npm install --workspaces --include-workspace-root --no-audit --no-fund", "Vercel install command drifted");
expect(vercel.buildCommand === "npm run build", "Vercel build command drifted");
expect(vercel.outputDirectory === "apps/web/.next", "Vercel Next.js output directory drifted");
expect(vercel.ignoreCommand === "[ \"$VERCEL_GIT_COMMIT_REF\" != \"main\" ]", "Vercel quota guard must reserve automatic builds for main");

for (const marker of ["pnpm typecheck", "pnpm content:validate", "pnpm test", "pnpm db:migrate", "pnpm deploy:check", "pnpm build", "e2e:cohort", "e2e:first-cohort"]) {
  expect(ci.includes(marker), `CI contract missing: ${marker}`);
}

expect(interventionsRoute.includes("recordInterventionLifecycle"), "Intervention mutation contract missing");
expect(interventionsRoute.includes("readJsonBody"), "Intervention mutation must use secured JSON body parsing");
expect(operationsRepository.includes("ops.intervention.lifecycle.v1"), "Intervention lifecycle event contract missing");
expect(operationsRepository.includes("ACKNOWLEDGED") && operationsRepository.includes("RESOLVED"), "Intervention lifecycle states missing");

expect(incidentsRoute.includes("evaluateLaunchIncidents"), "Launch incident API projection missing");
expect(incidentsRoute.includes("hasOpsSession"), "Launch incident API must remain Ops-protected");
expect(launchIncidents.includes('LaunchDecision = "GO" | "WATCH" | "STOP"'), "Launch incident decision contract changed");
expect(launchIncidents.includes('LaunchIncidentSeverity = "P0" | "P1" | "P2"'), "Launch incident severity contract changed");
expect(launchIncidents.includes('category === "BUG" && item.rating === 1'), "P0 bug stop-the-line rule missing");

expect(releaseWorkflow.includes("workflow_dispatch"), "Production Launch Gate must remain manually dispatchable");
expect(releaseWorkflow.includes("apps/web/scripts/production-launch-gate.mjs"), "Production Launch Gate workflow must execute the production gate");
expect(releaseWorkflow.includes("node-version: 22"), "Production Launch Gate must remain pinned to Node 22");
expect(releaseWorkflow.includes("Decision: **GO**"), "Production Launch Gate must publish an explicit GO decision");
expect(releaseWorkflow.includes("Decision: **NO-GO**"), "Production Launch Gate must publish an explicit NO-GO decision");

if (failures.length) {
  console.error(`RELEASE_FREEZE=FAIL count=${failures.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`RELEASE_FREEZE=PASS required_files=${requiredFiles.length} node=22.x pnpm=10.15.0 vercel_installer=npm-workspaces framework=nextjs output=apps/web/.next quota_guard=main-only intervention_lifecycle=frozen incident_triage=frozen rc=RC1 production_launch_gate=frozen`);
