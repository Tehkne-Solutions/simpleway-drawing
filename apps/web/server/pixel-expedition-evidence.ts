export type PixelMissionId = "pixel" | "sprite" | "tile" | "animation";
export type PixelValue = string | null;

export const PIXEL_EXPEDITION_KEY = "expedition.swd.pixel.synthesis.v1";

export const PIXEL_MISSION_CONFIG = {
  pixel: {
    exerciseKey: "exercise.swd.pixel.synthesis",
    skillKey: "skill.drawing.creative.pixel_synthesis",
    title: "Olho de Croma · Forma dominada",
    reward: "Sigilo da Forma",
    dimension: "pixel_synthesis",
  },
  sprite: {
    exerciseKey: "exercise.swd.pixel.sprite_motion",
    skillKey: "skill.drawing.creative.sprite_motion",
    title: "Pulso de Croma · Movimento dominado",
    reward: "Sigilo do Movimento",
    dimension: "sprite_motion",
  },
  tile: {
    exerciseKey: "exercise.swd.pixel.tile_continuity",
    skillKey: "skill.drawing.creative.pattern_continuity",
    title: "Tessela de Croma · Continuidade dominada",
    reward: "Sigilo da Continuidade",
    dimension: "pattern_continuity",
  },
  animation: {
    exerciseKey: "exercise.swd.pixel.animation_timing",
    skillKey: "skill.drawing.creative.animation_timing",
    title: "Ritmo de Croma · Tempo dominado",
    reward: "Sigilo do Ritmo",
    dimension: "animation_timing",
  },
} as const;

export type PixelMissionConfig = (typeof PIXEL_MISSION_CONFIG)[PixelMissionId];

export interface ValidatedPixelMission {
  missionId: PixelMissionId;
  config: PixelMissionConfig;
  score: number;
  confidence: number;
  metrics: Record<string, number | string | boolean>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function missionIdOf(value: unknown): PixelMissionId {
  if (value === "pixel" || value === "sprite" || value === "tile" || value === "animation") return value;
  throw new Error("PIXEL_MISSION_NOT_SUPPORTED");
}

function isColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function parsePixels(value: unknown, expectedLength: number): PixelValue[] {
  if (!Array.isArray(value) || value.length !== expectedLength) throw new Error("INVALID_PIXEL_ARTIFACT");
  return value.map((item) => {
    if (item == null) return null;
    if (!isColor(item)) throw new Error("INVALID_PIXEL_COLOR");
    return item;
  });
}

function int(value: unknown, min: number, max: number, code: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) throw new Error(code);
  return value;
}

function bool(value: unknown, code: string): true {
  if (value !== true) throw new Error(code);
  return true;
}

function countColors(pixelGroups: PixelValue[][]): number {
  return new Set(pixelGroups.flatMap((pixels) => pixels.filter((value): value is string => Boolean(value)))).size;
}

function pixelSignature(pixels: PixelValue[]): string {
  return pixels.map((value) => value ?? "_").join("|");
}

function validatePixel(payload: Record<string, unknown>): Omit<ValidatedPixelMission, "missionId" | "config"> {
  const resolution = int(payload.resolution, 16, 16, "INVALID_PIXEL_RESOLUTION");
  const pixels = parsePixels(payload.pixels, resolution * resolution);
  const colors = new Set<string>();
  let painted = 0;
  let minX = resolution;
  let maxX = -1;
  let minY = resolution;
  let maxY = -1;
  pixels.forEach((value, index) => {
    if (!value) return;
    painted += 1;
    colors.add(value);
    const x = index % resolution;
    const y = Math.floor(index / resolution);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  const width = painted ? maxX - minX + 1 : 0;
  const height = painted ? maxY - minY + 1 : 0;
  const passed = painted >= 32 && colors.size >= 2 && colors.size <= 5 && width >= 7 && height >= 5;
  if (!passed) throw new Error("PIXEL_MISSION_CRITERIA_NOT_MET");
  return { score: 1, confidence: 0.86, metrics: { resolution, painted, colorCount: colors.size, width, height } };
}

function validateSprite(payload: Record<string, unknown>): Omit<ValidatedPixelMission, "missionId" | "config"> {
  const resolution = int(payload.resolution, 16, 32, "INVALID_SPRITE_RESOLUTION");
  if (resolution !== 16 && resolution !== 32) throw new Error("INVALID_SPRITE_RESOLUTION");
  if (!Array.isArray(payload.frames) || payload.frames.length < 4 || payload.frames.length > 8) throw new Error("INVALID_SPRITE_FRAMES");
  const frames = payload.frames.map((frame) => parsePixels(frame, resolution * resolution));
  const nonEmpty = frames.filter((frame) => frame.some(Boolean));
  const distinct = new Set(nonEmpty.map(pixelSignature)).size;
  const colorCount = countColors(frames);
  bool(payload.onionUsed, "SPRITE_ONION_REQUIRED");
  bool(payload.previewPlayed, "SPRITE_PLAYBACK_REQUIRED");
  if (nonEmpty.length < 3 || distinct < 3 || colorCount < 2 || colorCount > 5) throw new Error("SPRITE_MISSION_CRITERIA_NOT_MET");
  return { score: 1, confidence: 0.9, metrics: { resolution, frameCount: frames.length, nonEmptyFrames: nonEmpty.length, distinctPoses: distinct, colorCount, onionUsed: true, previewPlayed: true } };
}

function validateTile(payload: Record<string, unknown>): Omit<ValidatedPixelMission, "missionId" | "config"> {
  const resolution = int(payload.resolution, 8, 32, "INVALID_TILE_RESOLUTION");
  if (![8, 16, 32].includes(resolution)) throw new Error("INVALID_TILE_RESOLUTION");
  const pixels = parsePixels(payload.pixels, resolution * resolution);
  const painted = pixels.filter(Boolean).length;
  const colorCount = countColors([pixels]);
  const filled = (x: number, y: number) => Boolean(pixels[y * resolution + x]);
  const edges = [
    Array.from({ length: resolution }, (_, x) => filled(x, 0)).some(Boolean),
    Array.from({ length: resolution }, (_, x) => filled(x, resolution - 1)).some(Boolean),
    Array.from({ length: resolution }, (_, y) => filled(0, y)).some(Boolean),
    Array.from({ length: resolution }, (_, y) => filled(resolution - 1, y)).some(Boolean),
  ].filter(Boolean).length;
  const coverage = painted / pixels.length;
  const previewChecks = int(payload.previewChecks, 1, 100_000, "TILE_PREVIEW_REQUIRED");
  const offsetChecks = int(payload.offsetChecks, 1, 100_000, "TILE_OFFSET_REQUIRED");
  if (coverage < 0.12 || coverage > 0.82 || colorCount < 2 || colorCount > 6 || edges < 3) throw new Error("TILE_MISSION_CRITERIA_NOT_MET");
  return { score: 1, confidence: 0.9, metrics: { resolution, painted, coverage: Number(coverage.toFixed(4)), colorCount, edges, previewChecks, offsetChecks } };
}

function validateAnimation(payload: Record<string, unknown>): Omit<ValidatedPixelMission, "missionId" | "config"> {
  if (!Array.isArray(payload.frames) || payload.frames.length < 4 || payload.frames.length > 8) throw new Error("INVALID_ANIMATION_FRAMES");
  const frames = payload.frames.map((item) => {
    if (!isRecord(item)) throw new Error("INVALID_ANIMATION_FRAME");
    const pixels = parsePixels(item.pixels, 16 * 16);
    const duration = int(item.duration, 60, 600, "INVALID_ANIMATION_DURATION");
    return { pixels, duration };
  });
  bool(payload.timingUsed, "ANIMATION_TIMING_REQUIRED");
  bool(payload.onionUsed, "ANIMATION_ONION_REQUIRED");
  bool(payload.playUsed, "ANIMATION_PLAYBACK_REQUIRED");
  const distinct = new Set(frames.map((frame) => pixelSignature(frame.pixels))).size;
  const colorCount = countColors(frames.map((frame) => frame.pixels));
  const durations = frames.map((frame) => frame.duration);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  if (distinct < 3 || colorCount < 2) throw new Error("ANIMATION_MISSION_CRITERIA_NOT_MET");
  return { score: 1, confidence: 0.92, metrics: { resolution: 16, frameCount: frames.length, distinctPoses: distinct, colorCount, minDuration, maxDuration, timingUsed: true, onionUsed: true, playUsed: true } };
}

export function validatePixelMissionSubmission(input: unknown): ValidatedPixelMission {
  if (!isRecord(input)) throw new Error("INVALID_PIXEL_MISSION_INPUT");
  const missionId = missionIdOf(input.missionId);
  if (!isRecord(input.payload)) throw new Error("INVALID_PIXEL_MISSION_PAYLOAD");
  const result = missionId === "pixel"
    ? validatePixel(input.payload)
    : missionId === "sprite"
      ? validateSprite(input.payload)
      : missionId === "tile"
        ? validateTile(input.payload)
        : validateAnimation(input.payload);
  return { missionId, config: PIXEL_MISSION_CONFIG[missionId], ...result };
}
