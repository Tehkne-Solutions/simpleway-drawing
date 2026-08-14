import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("artwork detail accepts only a recognized past review cycle as historical focus", () => {
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /type ArtworkDetailSearchParams = \{ cycle\?: string \| string\[\] \}/);
  assert.match(page, /const requestedCycleVersion = cycleParam \? Number\(cycleParam\) : NaN/);
  assert.match(page, /Number\.isInteger\(requestedCycleVersion\)/);
  assert.match(page, /requestedCycleVersion >= 2/);
  assert.match(page, /requestedCycleVersion < latestVersionNumber/);
  assert.match(page, /version\.versionNumber === requestedCycleVersion && Boolean\(version\.reviewCycle\)/);
  assert.match(page, /focusCycleVersion=\{focusCycleVersion\}/);
  assert.match(page, /key=\{focusCycleVersion \? `historical-\$\{focusCycleVersion\}` : "latest"\}/);
});

test("historical context exists only when target, cycle and authoritative base all resolve", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  assert.match(component, /const requestedTarget = focusCycleVersion \? versions\.find/);
  assert.match(component, /const requestedCycle = requestedTarget \? resolveReviewCycle\(requestedTarget\) : null/);
  assert.match(component, /const requestedBase = requestedCycle \? versions\.find\(\(version\) => version\.versionNumber === requestedCycle\.baseVersionNumber\)/);
  assert.match(component, /latest && requestedTarget && requestedCycle && requestedBase && requestedTarget\.id !== latest\.id/);
  assert.match(component, /const target = historicalContext\?\.target \?\? latest/);
  assert.match(component, /const selected = historicalContext\?\.base \?\?/);
});

test("historical mode is exact-cycle read-only and cannot create a review intent", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  assert.match(component, /Mesa Histórica/);
  assert.match(component, /Base autoritativa fixa/);
  assert.match(component, /MODO SOMENTE LEITURA/);
  assert.match(component, /O passado não vira uma nova branch da obra/);
  assert.match(component, /const intentReady = !historicalContext && Boolean/);
  assert.match(component, /if \(!intentReady \|\| historicalContext\) return/);
  assert.match(component, /historicalContext \? \([\s\S]*version-historical-readonly[\s\S]*\) : \([\s\S]*version-compare-prompt/);
  assert.match(component, /const openCycle = \(versionNumber: number\) =>/);
  assert.match(component, /versionNumber === latest\.versionNumber/);
  assert.match(component, /const returnToLatest = \(\) => openCycle\(latest\.versionNumber\)/);
});

test("historical wipe compares preserved base against preserved target rather than latest", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  assert.match(component, /src=\{selected\.readUrl\} alt=\{`Base V\$\{selected\.versionNumber\}`\}/);
  assert.match(component, /src=\{target\.readUrl\} alt=\{`Sobreposição V\$\{target\.versionNumber\}`\}/);
  assert.match(component, /RESULTADO · V\$\{target\.versionNumber\}/);
  assert.match(component, /CICLO HISTÓRICO · V\$\{reviewBaseVersion\} → V\$\{target\.versionNumber\}/);
});

test("review notebook links old cycles into historical Mesa while current cycle stays local", () => {
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /Rever ciclo atual na Mesa ↑/);
  assert.match(page, /\?cycle=\$\{version\.versionNumber\}#version-comparison/);
  assert.match(page, /Rever este ciclo na Mesa →/);
});

test("historical comparison styling remains physical without gradient or glow", () => {
  const css = source("app/create/historical-comparison-v128.css");
  assert.match(css, /\.version-comparison\.is-historical/);
  assert.match(css, /\.version-historical-control/);
  assert.match(css, /\.version-historical-readonly/);
  assert.match(css, /\.version-cycle-replay/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|filter:\s*drop-shadow|text-shadow/);
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /import "\.\.\/historical-comparison-v128\.css"/);
});
