import type { AlphaFeedbackCategory } from "@swd/database";
import { NextResponse } from "next/server";
import { getClosedAlphaFeedbackRepository } from "../../../server/runtime";
import { readJsonBody, securityErrorResponse } from "../../../server/request-security";
import { requireSessionUserId } from "../../../server/session";

const categories = new Set<AlphaFeedbackCategory>(["LEARNING", "USABILITY", "BUG", "CONTENT", "OTHER"]);

type FeedbackBody = {
  category?: string;
  rating?: number;
  message?: string;
  path?: string | null;
};

export async function GET() {
  try {
    const userId = await requireSessionUserId();
    const feedback = await getClosedAlphaFeedbackRepository().listRecent(userId, 10);
    return NextResponse.json({ feedback }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "FEEDBACK_READ_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = await readJsonBody<FeedbackBody>(request, 8_192);
    const category = body.category as AlphaFeedbackCategory | undefined;
    const message = body.message?.trim() ?? "";
    const path = body.path?.trim() || null;

    if (!category || !categories.has(category)) {
      return NextResponse.json({ code: "FEEDBACK_CATEGORY_INVALID" }, { status: 400 });
    }
    if (!Number.isInteger(body.rating) || !body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ code: "FEEDBACK_RATING_INVALID" }, { status: 400 });
    }
    if (message.length < 3 || message.length > 2_000) {
      return NextResponse.json({ code: "FEEDBACK_MESSAGE_INVALID" }, { status: 400 });
    }
    if (path && path.length > 240) {
      return NextResponse.json({ code: "FEEDBACK_PATH_INVALID" }, { status: 400 });
    }

    const id = await getClosedAlphaFeedbackRepository().submit({
      userId,
      category,
      rating: body.rating,
      message,
      path,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const security = securityErrorResponse(error);
    if (security) return NextResponse.json({ code: security.code }, { status: security.status });
    const code = error instanceof Error ? error.message : "FEEDBACK_SUBMIT_FAILED";
    return NextResponse.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
