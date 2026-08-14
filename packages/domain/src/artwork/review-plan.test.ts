import assert from "node:assert/strict";
import test from "node:test";
import { normalizeArtworkReviewPlan, REVIEW_PLAN_DECISION_MAX_LENGTH } from "./review-plan";

test("normalizes a bounded structured artwork review plan", () => {
  assert.deepEqual(normalizeArtworkReviewPlan({ preserve: "  silhueta  ", transform: " peso das linhas ", baseVersionNumber: 2 }), {
    preserve: "silhueta",
    transform: "peso das linhas",
    baseVersionNumber: 2,
  });
});

test("rejects partial, invalid-version and oversized review plans", () => {
  assert.equal(normalizeArtworkReviewPlan(null), null);
  assert.equal(normalizeArtworkReviewPlan({ preserve: "silhueta", baseVersionNumber: 2 }), null);
  assert.equal(normalizeArtworkReviewPlan({ preserve: "silhueta", transform: "linhas", baseVersionNumber: 0 }), null);
  assert.equal(normalizeArtworkReviewPlan({ preserve: "silhueta", transform: "linhas", baseVersionNumber: 1.5 }), null);
  assert.equal(normalizeArtworkReviewPlan({ preserve: "x".repeat(REVIEW_PLAN_DECISION_MAX_LENGTH + 1), transform: "linhas", baseVersionNumber: 1 }), null);
});
