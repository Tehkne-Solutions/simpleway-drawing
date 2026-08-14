import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("Pixel Studio remains a first-class immersive game workspace", () => {
  const shell = source("app/app-shell.tsx");
  const home = source("app/page.tsx");
  const page = source("app/create/pixel/page.tsx");
  const nav = source("app/create/pixel/pixel-mode-nav.tsx");
  const canvas = source("app/create/pixel/pixel-canvas.tsx");

  assert.match(shell, /pathname\.startsWith\("\/create\/pixel"\)/);
  assert.match(home, /href="\/create\/pixel\/quest"/);
  assert.match(home, /Expedição da Síntese/);
  assert.match(nav, /href="\/create\/pixel"/);
  assert.match(nav, /01 · Pixel Studio/);
  assert.match(page, /Atelier da Síntese/);
  assert.match(page, /PixelCanvas/);

  assert.match(canvas, /16, 32, 64/);
  assert.match(canvas, /Grid pixel-a-pixel/);
  assert.match(canvas, /Espelho horizontal/);
  assert.match(canvas, /PNG nativo/);
  assert.match(canvas, /PNG 16×/);
  assert.match(canvas, /Olho de Croma/);
  assert.match(canvas, /paleta/i);
  assert.match(canvas, /localStorage/);
});
