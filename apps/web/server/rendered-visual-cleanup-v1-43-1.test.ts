import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("V1.43.1 cleanup loads after Croma/game surfaces and preserves mobile rail navigation", () => {
  const layout = source("app/layout.tsx");
  const css = source("app/rendered-visual-cleanup-v1-43-1.css");
  assert.match(layout, /croma-v1-43\.css";\nimport "\.\/game-surfaces-v1-43\.css";\nimport "\.\/rendered-visual-cleanup-v1-43-1\.css";/);
  assert.match(css, /\.mission-scene-rail\{overflow-x:hidden\}/);
  assert.match(css, /@media\(max-width:680px\)\{\.mission-scene-rail\{overflow-x:auto\}\}/);
});

test("Lab grids are authored SVG plates without decorative CSS gradients", () => {
  const css = source("app/rendered-visual-cleanup-v1-43-1.css");
  assert.match(css, /--swd-grid-neutral:url\("data:image\/svg\+xml/);
  assert.match(css, /\.line-gym-board\{background-image:var\(--swd-grid-neutral\)!important/);
  assert.match(css, /\.observation-visual\{background-image:var\(--swd-grid-blue\)!important/);
  assert.match(css, /\.construction-visual\{background-image:var\(--swd-grid-green\)!important/);
  assert.match(css, /\.form-visual\{background-image:var\(--swd-grid-violet\)!important/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient/);
});

test("locked campaign region uses authored state rather than saturation filter", () => {
  const css = source("app/rendered-visual-cleanup-v1-43-1.css");
  assert.match(css, /\.campaign-region\.is-locked\{filter:none!important\}/);
});