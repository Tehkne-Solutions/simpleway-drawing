import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Animation Lab keeps the timing-first pixel contract", () => {
  const page = source("app/create/pixel/animation/page.tsx");
  const animation = source("app/create/pixel/animation/animation-lab.tsx");
  const nav = source("app/create/pixel/pixel-mode-nav.tsx");

  assert.match(page, /PixelModeNav active="animation"/);
  assert.match(nav, /create\/pixel\/animation/);
  assert.match(animation, /Ritmo de Croma/);
  assert.match(animation, /duration/);
  assert.match(animation, /pingpong/);
  assert.match(animation, /Onion anterior/);
  assert.match(animation, /Spritesheet PNG/);
  assert.match(animation, /Metadata JSON/);
  assert.match(animation, /swd-animation-v1/);
  assert.match(animation, /localStorage/);
});
