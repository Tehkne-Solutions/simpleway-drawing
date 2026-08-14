import { NextResponse } from "next/server";
import { logServerError } from "../../../../server/logger";
import { validatePixelMissionSubmission } from "../../../../server/pixel-expedition-evidence";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../../server/request-security";
import { getPixelExpeditionRepository } from "../../../../server/runtime";
import { requireSessionUserId } from "../../../../server/session";

const CLIENT_ERRORS = new Set([
  "INVALID_PIXEL_MISSION_INPUT",
  "PIXEL_MISSION_NOT_SUPPORTED",
  "INVALID_PIXEL_MISSION_PAYLOAD",
  "INVALID_PIXEL_RESOLUTION",
  "INVALID_PIXEL_ARTIFACT",
  "INVALID_PIXEL_COLOR",
  "PIXEL_MISSION_CRITERIA_NOT_MET",
  "INVALID_SPRITE_RESOLUTION",
  "INVALID_SPRITE_FRAMES",
  "SPRITE_ONION_REQUIRED",
  "SPRITE_PLAYBACK_REQUIRED",
  "SPRITE_MISSION_CRITERIA_NOT_MET",
  "INVALID_TILE_RESOLUTION",
  "TILE_PREVIEW_REQUIRED",
  "TILE_OFFSET_REQUIRED",
  "TILE_MISSION_CRITERIA_NOT_MET",
  "INVALID_ANIMATION_FRAMES",
  "INVALID_ANIMATION_FRAME",
  "INVALID_ANIMATION_DURATION",
  "ANIMATION_TIMING_REQUIRED",
  "ANIMATION_ONION_REQUIRED",
  "ANIMATION_PLAYBACK_REQUIRED",
  "ANIMATION_MISSION_CRITERIA_NOT_MET",
  "PIXEL_EVIDENCE_CONFIG_MISMATCH",
]);

export async function GET(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const snapshot = await getPixelExpeditionRepository().getSnapshot(userId);
    return NextResponse.json(snapshot, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PIXEL_EXPEDITION_READ_FAILED";
    if (code !== "UNAUTHENTICATED") logServerError("pixel_expedition.read_failed", request, error);
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500, headers: { "cache-control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireSessionUserId();
    const body = await readJsonBody<unknown>(request, 300_000);
    const validated = validatePixelMissionSubmission(body);
    const result = await getPixelExpeditionRepository().recordMission(userId, {
      missionId: validated.missionId,
      exerciseKey: validated.config.exerciseKey,
      skillKey: validated.config.skillKey,
      title: validated.config.title,
      reward: validated.config.reward,
      dimension: validated.config.dimension,
      score: validated.score,
      confidence: validated.confidence,
      metrics: validated.metrics,
    });
    return NextResponse.json({ missionId: validated.missionId, ...result }, { status: result.created ? 201 : 200, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "PIXEL_EXPEDITION_SUBMIT_FAILED";
    const status = code === "UNAUTHENTICATED" ? 401 : CLIENT_ERRORS.has(code) ? 400 : 500;
    if (status === 500) logServerError("pixel_expedition.submit_failed", request, error);
    return NextResponse.json({ code }, { status, headers: { "cache-control": "no-store" } });
  }
}
