export type StudioMissionId = "manga" | "isometric";

type Point = { x: number; y: number };
type MangaView = "front" | "three-quarter" | "profile";
type MangaStroke = { points: Point[]; pigment?: string };
type IsoStroke = { tool: "segment" | "free"; points: Point[]; snapped?: boolean; pigment?: string };

export const STUDIO_MISSION_CONFIG = {
  manga: {
    exerciseKey: "exercise.swd.manga.head_views",
    skillKey: "skill.drawing.creative.manga_head_construction",
    title: "Códice de Croma · Cabeça em três vistas",
    reward: "Sigilo das Vistas",
    dimension: "manga_head_views",
  },
  isometric: {
    exerciseKey: "exercise.swd.isometric.cube_axes",
    skillKey: "skill.drawing.creative.isometric_construction",
    title: "Prisma de Croma · Três eixos dominados",
    reward: "Sigilo dos Eixos",
    dimension: "isometric_axes",
  },
} as const;

export type StudioMissionConfig = (typeof STUDIO_MISSION_CONFIG)[StudioMissionId];

export interface ValidatedStudioMission {
  missionId: StudioMissionId;
  config: StudioMissionConfig;
  score: number;
  confidence: number;
  metrics: Record<string, number | string | boolean>;
}

const MANGA_VIEWS: MangaView[] = ["front", "three-quarter", "profile"];
const STRUCTURAL_GUIDES = ["skull", "center", "eyes", "jaw"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(code);
  return value;
}

function point(value: unknown): Point {
  if (!isRecord(value)) throw new Error("INVALID_STUDIO_POINT");
  const x = finiteNumber(value.x, "INVALID_STUDIO_POINT");
  const y = finiteNumber(value.y, "INVALID_STUDIO_POINT");
  if (x < -2000 || x > 4000 || y < -2000 || y > 4000) throw new Error("STUDIO_POINT_OUT_OF_RANGE");
  return { x, y };
}

function points(value: unknown, min = 2, max = 5000): Point[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error("INVALID_STUDIO_STROKE");
  return value.map(point);
}

function pathLength(path: Point[]): number {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1]!;
    const current = path[index]!;
    total += Math.hypot(current.x - previous.x, current.y - previous.y);
  }
  return total;
}

function bounds(paths: Point[][]): { width: number; height: number } {
  const all = paths.flat();
  if (!all.length) return { width: 0, height: 0 };
  const xs = all.map((item) => item.x);
  const ys = all.map((item) => item.y);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

function parseMangaStroke(value: unknown): MangaStroke {
  if (!isRecord(value)) throw new Error("INVALID_MANGA_STROKE");
  return { points: points(value.points) };
}

function validateManga(payload: Record<string, unknown>): Omit<ValidatedStudioMission, "missionId" | "config"> {
  if (!isRecord(payload.strokesByView) || !isRecord(payload.guideUsageByView)) throw new Error("INVALID_MANGA_ARTIFACT");
  let totalMeaningful = 0;
  let totalLength = 0;
  const metrics: Record<string, number | string | boolean> = {};

  for (const view of MANGA_VIEWS) {
    const rawStrokes = payload.strokesByView[view];
    if (!Array.isArray(rawStrokes) || rawStrokes.length > 400) throw new Error("INVALID_MANGA_VIEW_STROKES");
    const strokes = rawStrokes.map(parseMangaStroke);
    const meaningful = strokes.filter((stroke) => pathLength(stroke.points) >= 18);
    const length = meaningful.reduce((sum, stroke) => sum + pathLength(stroke.points), 0);
    const viewBounds = bounds(meaningful.map((stroke) => stroke.points));
    const usage = payload.guideUsageByView[view];
    if (!isRecord(usage)) throw new Error("INVALID_MANGA_GUIDE_USAGE");
    const guidesUsed = STRUCTURAL_GUIDES.filter((guide) => usage[guide] === true).length;

    metrics[`${view}_strokes`] = meaningful.length;
    metrics[`${view}_path_length`] = Math.round(length);
    metrics[`${view}_width`] = Math.round(viewBounds.width);
    metrics[`${view}_height`] = Math.round(viewBounds.height);
    metrics[`${view}_guides`] = guidesUsed;

    if (meaningful.length < 6 || length < 240 || viewBounds.width < 80 || viewBounds.height < 80 || guidesUsed < STRUCTURAL_GUIDES.length) {
      throw new Error("MANGA_VIEW_CRITERIA_NOT_MET");
    }
    totalMeaningful += meaningful.length;
    totalLength += length;
  }

  return {
    score: 1,
    confidence: 0.9,
    metrics: { ...metrics, viewsCompleted: 3, totalMeaningfulStrokes: totalMeaningful, totalPathLength: Math.round(totalLength) },
  };
}

export type IsometricAxis = "axis30" | "vertical" | "axis150" | "off-axis";

export function classifyIsometricAxis(a: Point, b: Point, toleranceDeg = 8): IsometricAxis {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < 1) return "off-axis";
  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  angle = ((angle % 180) + 180) % 180;
  const circularDistance = (target: number) => Math.min(Math.abs(angle - target), 180 - Math.abs(angle - target));
  if (circularDistance(30) <= toleranceDeg) return "axis30";
  if (circularDistance(90) <= toleranceDeg) return "vertical";
  if (circularDistance(150) <= toleranceDeg) return "axis150";
  return "off-axis";
}

function parseIsoStroke(value: unknown): IsoStroke {
  if (!isRecord(value) || (value.tool !== "segment" && value.tool !== "free")) throw new Error("INVALID_ISOMETRIC_STROKE");
  return { tool: value.tool, points: points(value.points), snapped: value.snapped === true };
}

function validateIsometric(payload: Record<string, unknown>): Omit<ValidatedStudioMission, "missionId" | "config"> {
  if (!Array.isArray(payload.strokes) || payload.strokes.length > 500) throw new Error("INVALID_ISOMETRIC_ARTIFACT");
  const strokes = payload.strokes.map(parseIsoStroke);
  const aligned = strokes
    .filter((stroke) => stroke.tool === "segment" && pathLength(stroke.points) >= 24)
    .map((stroke) => ({ stroke, axis: classifyIsometricAxis(stroke.points[0]!, stroke.points.at(-1)!) }))
    .filter((item) => item.axis !== "off-axis");
  const axis30 = aligned.filter((item) => item.axis === "axis30").length;
  const vertical = aligned.filter((item) => item.axis === "vertical").length;
  const axis150 = aligned.filter((item) => item.axis === "axis150").length;
  const snappedSegments = aligned.filter((item) => item.stroke.snapped).length;
  const studyBounds = bounds(aligned.map((item) => item.stroke.points));

  if (aligned.length < 9 || axis30 < 3 || vertical < 3 || axis150 < 3 || snappedSegments < 6 || studyBounds.width < 96 || studyBounds.height < 60) {
    throw new Error("ISOMETRIC_AXES_CRITERIA_NOT_MET");
  }

  return {
    score: 1,
    confidence: 0.92,
    metrics: {
      alignedSegments: aligned.length,
      axis30,
      vertical,
      axis150,
      snappedSegments,
      width: Math.round(studyBounds.width),
      height: Math.round(studyBounds.height),
    },
  };
}

export function validateStudioEvidenceSubmission(input: unknown): ValidatedStudioMission {
  if (!isRecord(input)) throw new Error("INVALID_STUDIO_EVIDENCE_INPUT");
  const missionId = input.missionId;
  if (missionId !== "manga" && missionId !== "isometric") throw new Error("STUDIO_MISSION_NOT_SUPPORTED");
  if (!isRecord(input.payload)) throw new Error("INVALID_STUDIO_EVIDENCE_PAYLOAD");
  const result = missionId === "manga" ? validateManga(input.payload) : validateIsometric(input.payload);
  return { missionId, config: STUDIO_MISSION_CONFIG[missionId], ...result };
}
