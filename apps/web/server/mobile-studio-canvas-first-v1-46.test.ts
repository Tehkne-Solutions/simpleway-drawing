import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("V1.46 canvas-first rules load after all previous game and visual layers", () => {
  const layout = source("app/layout.tsx");
  assert.match(layout, /rendered-visual-cleanup-v1-43-1\.css";\nimport "\.\/mobile-studio-canvas-first-v1-46\.css";/);
});

test("mobile authoring and drawing studios put the drawing surface before tool panels", () => {
  const css = source("app/mobile-studio-canvas-first-v1-46.css");
  assert.match(css, /\.work-canvas-station\{order:-1/);
  assert.match(css, /\.manga-canvas-panel\{order:-1/);
  assert.match(css, /\.iso-workbench\{order:-1/);
  assert.match(css, /\.pixel-stage\{order:-1/);
  assert.match(css, /\.sprite-stage\{order:-1/);
  assert.match(css, /\.tile-workbench\{order:-1/);
  assert.match(css, /\.animation-workbench\{order:-1/);
});

test("mobile tools remain available after the canvas instead of being hidden", () => {
  const css = source("app/mobile-studio-canvas-first-v1-46.css");
  assert.match(css, /\.work-chamber-tools\{order:1\}/);
  assert.match(css, /\.manga-tools\{order:1\}/);
  assert.match(css, /\.iso-mission-panel\{order:1\}/);
  assert.match(css, /\.pixel-tools\{order:1\}/);
  assert.match(css, /\.sprite-tools\{order:1\}/);
  assert.match(css, /\.tile-tools\{order:1\}/);
  assert.match(css, /\.animation-tools\{order:1\}/);
});

test("Pixel family uses a compact horizontal mode rail on mobile", () => {
  const css = source("app/mobile-studio-canvas-first-v1-46.css");
  assert.match(css, /\.pixel-mode-nav\{display:flex!important;flex-wrap:nowrap!important/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /scroll-snap-type:x proximity/);
});
