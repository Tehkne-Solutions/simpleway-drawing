import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("Sprite Lab keeps the Atelier da Sintese game contract", () => {
  const pixelPage = source("app/create/pixel/page.tsx");
  const spritePage = source("app/create/pixel/sprite/page.tsx");
  const sprite = source("app/create/pixel/sprite/sprite-lab.tsx");

  assert.match(pixelPage, /Sprite Lab/);
  assert.match(spritePage, /Atelier da Síntese/);
  assert.match(spritePage, /SpriteLab/);
  assert.match(sprite, /onionSkin/);
  assert.match(sprite, /Spritesheet PNG/);
  assert.match(sprite, /Spritesheet 16×/);
  assert.match(sprite, /Pulso de Croma/);
  assert.match(sprite, /MAX_FRAMES = 8/);
  assert.match(sprite, /2 FPS/);
  assert.match(sprite, /8 FPS/);
  assert.match(sprite, /localStorage/);
});
