import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Tile Lab keeps the seamless pixel-art contract", () => {
  const page = source("app/create/pixel/tile/page.tsx");
  const tile = source("app/create/pixel/tile/tile-lab.tsx");
  const nav = source("app/create/pixel/pixel-mode-nav.tsx");

  assert.match(page, /Atelier da Síntese/);
  assert.match(page, /PixelModeNav active="tile"/);
  assert.match(nav, /create\/pixel\/tile/);
  assert.match(tile, /8 \| 16 \| 32/);
  assert.match(tile, /wrapPaint/);
  assert.match(tile, /Preview contínuo · 3×3/);
  assert.match(tile, /offsetX/);
  assert.match(tile, /offsetY/);
  assert.match(tile, /Pattern Sheet 3×3/);
  assert.match(tile, /Tessela de Croma/);
  assert.match(tile, /localStorage/);
});
