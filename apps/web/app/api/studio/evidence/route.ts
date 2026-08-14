import { NextResponse } from "next/server";
import { logServerError } from "../../../../server/logger";
import { assertSameOrigin, readJsonBody, securityErrorResponse } from "../../../../server/request-security";
import { getStudioEvidenceRepository } from "../../../../server/runtime";
import { requireSessionUserId } from "../../../../server/session";
import { validateStudioEvidenceSubmission } from "../../../../server/studio-evidence";

const CLIENT_ERRORS = new Set([
  "INVALID_STUDIO_EVIDENCE_INPUT",
  "STUDIO_MISSION_NOT_SUPPORTED",
  "INVALID_STUDIO_EVIDENCE_PAYLOAD",
  "INVALID_STUDIO_POINT",
  "STUDIO_POINT_OUT_OF_RANGE",
  "INVALID_STUDIO_STROKE",
  "INVALID_MANGA_ARTIFACT",
  "INVALID_MANGA_VIEW_STROKES",
  "INVALID_MANGA_STROKE",
  "INVALID_MANGA_GUIDE_USAGE",
  "MANGA_VIEW_CRITERIA_NOT_MET",
  "INVALID_ISOMETRIC_ARTIFACT",
  "INVALID_ISOMETRIC_STROKE",
  "ISOMETRIC_AXES_CRITERIA_NOT_MET",
  "STUDIO_EVIDENCE_CONFIG_MISMATCH",
]);

export async function GET(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const snapshot = await getStudioEvidenceRepository().getSnapshot(userId);
    return NextResponse.json(snapshot, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "STUDIO_EVIDENCE_READ_FAILED";
    if (code !== "UNAUTHENTICATED") logServerError("studio_evidence.read_failed", request, error);
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500, headers: { "cache-control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireSessionUserId();
    const body = await readJsonBody<unknown>(request, 500_000);
    const validated = validateStudioEvidenceSubmission(body);
    const result = await getStudioEvidenceRepository().recordMission(userId, {
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
    const code = error instanceof Error ? error.message : "STUDIO_EVIDENCE_SUBMIT_FAILED";
    const status = code === "UNAUTHENTICATED" ? 401 : CLIENT_ERRORS.has(code) ? 400 : 500;
    if (status === 500) logServerError("studio_evidence.submit_failed", request, error);
    return NextResponse.json({ code }, { status, headers: { "cache-control": "no-store" } });
  }
}
