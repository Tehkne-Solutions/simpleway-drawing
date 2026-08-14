import assert from "node:assert/strict";
import test from "node:test";
import { validatePixelMissionSubmission } from "./pixel-expedition-evidence";

type Pixel = string | null;
const BLACK = "#181715";
const GOLD = "#f2b705";
const blank = (resolution: number): Pixel[] => Array.from({ length: resolution * resolution }, () => null);
const put = (pixels: Pixel[], resolution: number, x: number, y: number, color: string) => { pixels[y * resolution + x] = color; };

function pixelArtifact() {
  const pixels = blank(16);
  for (let y = 4; y < 12; y += 1) for (let x = 4; x < 12; x += 1) put(pixels, 16, x, y, (x + y) % 2 ? BLACK : GOLD);
  return { missionId: "pixel", payload: { resolution: 16, pixels } };
}

function spriteArtifact() {
  const frames = Array.from({ length: 4 }, (_, frameIndex) => {
    const pixels = blank(16);
    const offset = frameIndex < 3 ? frameIndex : 1;
    for (let y = 6; y < 10; y += 1) for (let x = 5 + offset; x < 9 + offset; x += 1) put(pixels, 16, x, y, (x + y) % 2 ? BLACK : GOLD);
    return pixels;
  });
  return { missionId: "sprite", payload: { resolution: 16, frames, onionUsed: true, previewPlayed: true } };
}

function tileArtifact() {
  const pixels = blank(16);
  for (let x = 0; x < 16; x += 2) { put(pixels, 16, x, 0, BLACK); put(pixels, 16, x, 15, GOLD); }
  for (let y = 2; y < 14; y += 2) { put(pixels, 16, 0, y, GOLD); put(pixels, 16, 15, y, BLACK); }
  for (let y = 5; y < 11; y += 1) for (let x = 5; x < 11; x += 1) put(pixels, 16, x, y, (x + y) % 2 ? BLACK : GOLD);
  return { missionId: "tile", payload: { resolution: 16, pixels, previewChecks: 1, offsetChecks: 2 } };
}

function animationArtifact() {
  const frames = Array.from({ length: 4 }, (_, frameIndex) => {
    const pixels = blank(16);
    const offset = frameIndex < 3 ? frameIndex : 1;
    for (let y = 6; y < 10; y += 1) for (let x = 5 + offset; x < 9 + offset; x += 1) put(pixels, 16, x, y, (x + y) % 2 ? BLACK : GOLD);
    return { pixels, duration: frameIndex === 1 ? 260 : 160 };
  });
  return { missionId: "animation", payload: { frames, timingUsed: true, onionUsed: true, playUsed: true } };
}

test("server validates all four Synthesis Expedition artifacts from real canvas state", () => {
  const pixel = validatePixelMissionSubmission(pixelArtifact());
  const sprite = validatePixelMissionSubmission(spriteArtifact());
  const tile = validatePixelMissionSubmission(tileArtifact());
  const animation = validatePixelMissionSubmission(animationArtifact());

  assert.equal(pixel.config.skillKey, "skill.drawing.creative.pixel_synthesis");
  assert.equal(sprite.config.skillKey, "skill.drawing.creative.sprite_motion");
  assert.equal(tile.config.skillKey, "skill.drawing.creative.pattern_continuity");
  assert.equal(animation.config.skillKey, "skill.drawing.creative.animation_timing");
  assert.equal(pixel.score, 1);
  assert.equal(sprite.metrics.onionUsed, true);
  assert.equal(tile.metrics.edges, 4);
  assert.equal(animation.metrics.maxDuration, 260);
});

test("server refuses decorative completion flags without the actual artifact", () => {
  assert.throws(() => validatePixelMissionSubmission({ missionId: "pixel", payload: { complete: true } }), /INVALID_PIXEL_RESOLUTION/);
  assert.throws(() => validatePixelMissionSubmission({ missionId: "sprite", payload: { frames: [], onionUsed: true, previewPlayed: true } }), /INVALID_SPRITE_RESOLUTION/);
});

test("server requires pedagogical process evidence for motion, continuity and timing", () => {
  const sprite = spriteArtifact();
  (sprite.payload as Record<string, unknown>).onionUsed = false;
  assert.throws(() => validatePixelMissionSubmission(sprite), /SPRITE_ONION_REQUIRED/);

  const tile = tileArtifact();
  (tile.payload as Record<string, unknown>).previewChecks = 0;
  assert.throws(() => validatePixelMissionSubmission(tile), /TILE_PREVIEW_REQUIRED/);

  const animation = animationArtifact();
  (animation.payload as Record<string, unknown>).playUsed = false;
  assert.throws(() => validatePixelMissionSubmission(animation), /ANIMATION_PLAYBACK_REQUIRED/);
});

test("server rejects invalid pixel colors and malformed frame shapes", () => {
  const pixel = pixelArtifact();
  (pixel.payload.pixels as unknown[])[0] = "red";
  assert.throws(() => validatePixelMissionSubmission(pixel), /INVALID_PIXEL_COLOR/);

  const animation = animationArtifact();
  (animation.payload.frames as unknown[])[0] = { pixels: [BLACK], duration: 160 };
  assert.throws(() => validatePixelMissionSubmission(animation), /INVALID_PIXEL_ARTIFACT/);
});
