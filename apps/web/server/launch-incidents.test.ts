import assert from "node:assert/strict";
import test from "node:test";
import { evaluateLaunchIncidents } from "./launch-incidents";

const feedback = (overrides: Partial<any> = {}) => ({
  id: "feedback-1",
  category: "OTHER",
  rating: 5,
  message: "ok",
  path: "/",
  createdAt: new Date("2026-08-04T12:00:00Z"),
  userId: "user-1",
  ...overrides,
});

const intervention = (overrides: Partial<any> = {}) => ({
  userId: "user-1",
  displayName: "Tester",
  stage: "FOUNDATION",
  cohortLabel: "Alpha 01",
  lastSeenAt: new Date("2026-08-04T12:00:00Z"),
  sessionCount: 2,
  heartbeatCount: 8,
  latestRating: null,
  reasons: ["STALLED_STAGE"],
  priority: "LOW",
  ...overrides,
});

test("GO when there are no launch incidents", () => {
  const result = evaluateLaunchIncidents({ feedback: [feedback()], interventions: [] });
  assert.equal(result.decision, "GO");
  assert.equal(result.incidents.length, 0);
});

test("P0 bug stops launch", () => {
  const result = evaluateLaunchIncidents({ feedback: [feedback({ category: "BUG", rating: 1, message: "upload impossible" })], interventions: [] });
  assert.equal(result.decision, "STOP");
  assert.equal(result.counts.P0, 1);
});

test("single HIGH intervention produces WATCH", () => {
  const result = evaluateLaunchIncidents({ feedback: [], interventions: [intervention({ priority: "HIGH", reasons: ["LOW_FEEDBACK"] })] });
  assert.equal(result.decision, "WATCH");
  assert.equal(result.counts.P2, 1);
});

test("two HIGH interventions stop cohort expansion", () => {
  const result = evaluateLaunchIncidents({
    feedback: [],
    interventions: [
      intervention({ userId: "user-1", priority: "HIGH" }),
      intervention({ userId: "user-2", priority: "HIGH" }),
    ],
  });
  assert.equal(result.decision, "STOP");
  assert.equal(result.counts.P1, 1);
});

test("rating two non-bug feedback is WATCH only", () => {
  const result = evaluateLaunchIncidents({ feedback: [feedback({ category: "CONTENT", rating: 2 })], interventions: [] });
  assert.equal(result.decision, "WATCH");
  assert.equal(result.counts.P2, 1);
});
