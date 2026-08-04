import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCohortReadiness } from "./cohort-readiness";

test("prelaunch cohort is ready while capacity exists", () => {
  const result = evaluateCohortReadiness({ maxUses: 10, redeemed: 0, onboarded: 0, active7d: 0, completed: 0, feedbackCount: 0, averageRating: null });
  assert.equal(result.state, "READY");
  assert.equal(result.phase, "PRELAUNCH");
  assert.equal(result.remainingCapacity, 10);
});

test("activation collapse puts expansion on hold", () => {
  const result = evaluateCohortReadiness({ maxUses: 10, redeemed: 4, onboarded: 1, active7d: 1, completed: 0, feedbackCount: 0, averageRating: null });
  assert.equal(result.state, "HOLD");
  assert.equal(result.phase, "ACTIVATION");
  assert.match(result.nextAction, /Interromper novos convites/);
});

test("moderate activation is watch, not hold", () => {
  const result = evaluateCohortReadiness({ maxUses: 10, redeemed: 4, onboarded: 2, active7d: 2, completed: 0, feedbackCount: 1, averageRating: 4 });
  assert.equal(result.state, "WATCH");
  assert.equal(result.phase, "ACTIVATION");
});

test("healthy active cohort stays ready", () => {
  const result = evaluateCohortReadiness({ maxUses: 10, redeemed: 5, onboarded: 5, active7d: 4, completed: 2, feedbackCount: 2, averageRating: 4.5 });
  assert.equal(result.state, "READY");
  assert.equal(result.phase, "ACTIVE");
  assert.equal(result.remainingCapacity, 5);
});

test("fully completed and filled cohort closes cleanly", () => {
  const result = evaluateCohortReadiness({ maxUses: 3, redeemed: 3, onboarded: 3, active7d: 3, completed: 3, feedbackCount: 3, averageRating: 4.7 });
  assert.equal(result.state, "COMPLETE");
  assert.equal(result.phase, "COMPLETION");
  assert.equal(result.remainingCapacity, 0);
});
