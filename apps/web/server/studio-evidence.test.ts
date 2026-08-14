import assert from "node:assert/strict";
import test from "node:test";
import { classifyIsometricAxis, validateStudioEvidenceSubmission } from "./studio-evidence";

const guides = { skull: true, center: true, eyes: true, jaw: true };

function mangaView(offset = 0) {
  return [
    { points: [{ x: 420 + offset, y: 180 }, { x: 540 + offset, y: 130 }, { x: 660 + offset, y: 180 }] },
    { points: [{ x: 400 + offset, y: 260 }, { x: 540 + offset, y: 240 }, { x: 680 + offset, y: 260 }] },
    { points: [{ x: 410 + offset, y: 350 }, { x: 540 + offset, y: 480 }, { x: 670 + offset, y: 350 }] },
    { points: [{ x: 540 + offset, y: 130 }, { x: 540 + offset, y: 470 }] },
    { points: [{ x: 430 + offset, y: 300 }, { x: 650 + offset, y: 300 }] },
    { points: [{ x: 470 + offset, y: 210 }, { x: 610 + offset, y: 420 }] },
  ];
}

function validManga() {
  return {
    missionId: "manga",
    payload: {
      strokesByView: {
        front: mangaView(),
        "three-quarter": mangaView(12),
        profile: mangaView(24),
      },
      guideUsageByView: {
        front: guides,
        "three-quarter": guides,
        profile: guides,
      },
    },
  };
}

function validIsometric() {
  const segment = (x1: number, y1: number, x2: number, y2: number) => ({ tool: "segment", snapped: true, points: [{ x: x1, y: y1 }, { x: x2, y: y2 }] });
  return {
    missionId: "isometric",
    payload: {
      strokes: [
        segment(100, 120, 184, 168.5), segment(130, 210, 214, 258.5), segment(160, 300, 244, 348.5),
        segment(300, 100, 300, 196), segment(360, 160, 360, 256), segment(420, 220, 420, 316),
        segment(620, 120, 536, 168.5), segment(590, 210, 506, 258.5), segment(560, 300, 476, 348.5),
      ],
    },
  };
}

test("Manga evidence requires three independent constructed views", () => {
  const result = validateStudioEvidenceSubmission(validManga());
  assert.equal(result.config.skillKey, "skill.drawing.creative.manga_head_construction");
  assert.equal(result.metrics.viewsCompleted, 3);
  assert.equal(result.metrics.totalMeaningfulStrokes, 18);

  const missingProfile = validManga();
  (missingProfile.payload.strokesByView as Record<string, unknown>).profile = [];
  assert.throws(() => validateStudioEvidenceSubmission(missingProfile), /MANGA_VIEW_CRITERIA_NOT_MET/);
});

test("Manga evidence requires guides to have been used while drawing, not merely a completion flag", () => {
  const artifact = validManga();
  (artifact.payload.guideUsageByView.profile as Record<string, unknown>).jaw = false;
  assert.throws(() => validateStudioEvidenceSubmission(artifact), /MANGA_VIEW_CRITERIA_NOT_MET/);
  assert.throws(() => validateStudioEvidenceSubmission({ missionId: "manga", payload: { complete: true } }), /INVALID_MANGA_ARTIFACT/);
});

test("isometric axis classifier recognizes 30, 90 and 150 degree families", () => {
  assert.equal(classifyIsometricAxis({ x: 0, y: 0 }, { x: 100, y: 57.7 }), "axis30");
  assert.equal(classifyIsometricAxis({ x: 0, y: 0 }, { x: 0, y: 100 }), "vertical");
  assert.equal(classifyIsometricAxis({ x: 100, y: 0 }, { x: 0, y: 57.7 }), "axis150");
  assert.equal(classifyIsometricAxis({ x: 0, y: 0 }, { x: 100, y: 10 }), "off-axis");
});

test("isometric evidence requires balanced axes and real snapped construction", () => {
  const result = validateStudioEvidenceSubmission(validIsometric());
  assert.equal(result.config.skillKey, "skill.drawing.creative.isometric_construction");
  assert.equal(result.metrics.axis30, 3);
  assert.equal(result.metrics.vertical, 3);
  assert.equal(result.metrics.axis150, 3);
  assert.equal(result.metrics.snappedSegments, 9);

  const artifact = validIsometric();
  const strokes = artifact.payload.strokes as Array<Record<string, unknown>>;
  strokes[0]!.snapped = false;
  strokes[1]!.snapped = false;
  strokes[2]!.snapped = false;
  strokes[3]!.snapped = false;
  assert.throws(() => validateStudioEvidenceSubmission(artifact), /ISOMETRIC_AXES_CRITERIA_NOT_MET/);
});
