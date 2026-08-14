import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("artwork detail opens comparison only when at least two preserved versions exist", () => {
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /VersionComparison/);
  assert.match(page, /comparisonVersions\.length >= 2/);
  assert.match(page, /version-compare-empty/);
  assert.match(page, /A segunda versão abrirá a comparação visual/);
  assert.match(page, /createdAt: version\.createdAt\.toISOString\(\)/);
});

test("comparison keeps current version fixed and only chooses from historical versions", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  assert.match(component, /const current = versions\[0\] \?\? null/);
  assert.match(component, /const historical = versions\.slice\(1\)/);
  assert.match(component, /historical\.find\(\(version\) => version\.versionNumber === selectedVersion\)/);
  assert.match(component, /Versão de referência/);
  assert.match(component, /ATUAL · V\{current\.versionNumber\}/);
  assert.match(component, /REFERÊNCIA · V\{selected\.versionNumber\}/);
});

test("comparison provides a visual wipe ruler without inventing automated art scores", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  assert.match(component, /RÉGUA DE SOBREPOSIÇÃO/);
  assert.match(component, /type="range"/);
  assert.match(component, /--compare-reveal/);
  assert.match(component, /O sistema não inventa uma nota sobre sua arte/);
  assert.match(component, /CROMA · DECISÃO DE REVISÃO/);
  assert.doesNotMatch(component, /score|mastery|grade|rating/i);
  assert.doesNotMatch(component, /fetch\(|method:\s*"POST"|method:\s*"PUT"|method:\s*"PATCH"/);
});

test("comparison preserves notes and keeps the next authoring action in Work Chamber", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(component, /selected\.notes/);
  assert.match(component, /current\.notes/);
  assert.match(component, /Preservar/);
  assert.match(component, /Transformar/);
  assert.match(page, /Criar próxima versão na Câmara/);
  assert.match(page, /\/create\/work\?artworkId=/);
});

test("comparison styling is physical and responsive without gradients or glow", () => {
  const css = source("app/visual-v1-create-journey.css");
  const rules = css.slice(css.indexOf("/* Version comparison"), css.indexOf("/* Journey:"));
  assert.match(rules, /\.version-comparison/);
  assert.match(rules, /\.version-compare-grid/);
  assert.match(rules, /\.version-wipe-canvas/);
  assert.match(rules, /clip-path: inset\(0 calc\(100% - var\(--compare-reveal\)\) 0 0\)/);
  assert.doesNotMatch(rules, /linear-gradient|radial-gradient|filter:\s*drop-shadow|text-shadow/);
  assert.match(css, /\.version-compare-grid \{ grid-template-columns: 1fr; \}/);
});
