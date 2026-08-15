import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("rendered visual recovery is loaded last and removes the observed mission rail x-scroll", () => {
  const layout = source("app/layout.tsx");
  const css = source("app/rendered-visual-recovery-v1-43.css");
  assert.match(layout, /player-hub-v1-6\.css";\nimport "\.\/rendered-visual-recovery-v1-43\.css";/);
  assert.match(css, /\.mission-scene-rail\{overflow-x:hidden\}/);
  assert.match(css, /@media\(max-width:680px\)\{\.mission-scene-rail\{overflow-x:auto\}\}/);
});

test("rendered Labs use authored SVG grids instead of decorative CSS gradients", () => {
  const css = source("app/rendered-visual-recovery-v1-43.css");
  assert.match(css, /--swd-grid-neutral:url\("data:image\/svg\+xml/);
  assert.match(css, /\.line-gym-board\{background-image:var\(--swd-grid-neutral\)!important/);
  assert.match(css, /\.observation-visual\{background-image:var\(--swd-grid-blue\)!important/);
  assert.match(css, /\.construction-visual\{background-image:var\(--swd-grid-green\)!important/);
  assert.match(css, /\.form-visual\{background-image:var\(--swd-grid-violet\)!important/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient/);
});

test("locked campaign regions no longer depend on a saturation filter", () => {
  const css = source("app/rendered-visual-recovery-v1-43.css");
  assert.match(css, /\.campaign-region\.is-locked\{filter:none!important\}/);
});
