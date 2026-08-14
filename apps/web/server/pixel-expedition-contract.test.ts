import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Synthesis Expedition connects the four pixel missions into a game loop", () => {
  const page = source("app/create/pixel/quest/page.tsx");
  const board = source("app/create/pixel/quest/pixel-quest-board.tsx");
  const nav = source("app/create/pixel/pixel-mode-nav.tsx");
  const create = source("app/create/page.tsx");
  const home = source("app/page.tsx");
  const tile = source("app/create/pixel/tile/tile-lab.tsx");
  const animation = source("app/create/pixel/animation/animation-lab.tsx");

  assert.match(page, /Expedição da Síntese/);
  assert.match(page, /PixelModeNav active="quest"/);
  assert.match(nav, /00 · Expedição/);
  assert.match(nav, /create\/pixel\/quest/);

  assert.match(board, /Olho de Croma/);
  assert.match(board, /Pulso de Croma/);
  assert.match(board, /Tessela de Croma/);
  assert.match(board, /Ritmo de Croma/);
  assert.match(board, /Sigilo da Forma/);
  assert.match(board, /Sigilo do Movimento/);
  assert.match(board, /Sigilo da Continuidade/);
  assert.match(board, /Sigilo do Ritmo/);
  assert.match(board, /500 XP da Expedição/);
  assert.match(board, /swd\.create\.pixel\.v1\.16/);
  assert.match(board, /swd\.create\.pixel\.sprite\.v1/);
  assert.match(board, /swd\.create\.pixel\.tile\.v1/);
  assert.match(board, /swd\.pixel\.animation\.v1/);

  assert.match(tile, /previewChecks/);
  assert.match(tile, /offsetChecks/);
  assert.match(tile, /JSON\.stringify\(\{ pixels, color, wrapPaint, previewChecks, offsetChecks \}/);
  assert.match(animation, /timingUsed/);
  assert.match(animation, /onionUsed/);
  assert.match(animation, /playUsed/);
  assert.match(animation, /JSON\.stringify\(\{frames,mode,tag,timingUsed,onionUsed,playUsed\}/);

  assert.match(create, /Expedição da Síntese/);
  assert.match(create, /Pixel Studio/);
  assert.match(home, /href="\/create\/pixel\/quest"/);
  assert.match(home, /Quatro missões conectam Pixel Studio, Sprite Lab, Tile Lab e Animation Lab/);
});
