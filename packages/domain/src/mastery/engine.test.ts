import assert from "node:assert/strict";
import test from "node:test";
import { masteryLevelFor, updateMastery } from "./engine";

test("first evidence remains introduced", () => {
  const result = updateMastery(null, { value: 0.92, confidence: 0.9, assistanceLevel: 0 });
  assert.equal(result.masteryLevel, "INTRODUCED");
  assert.equal(result.evidenceCount, 1);
});

test("independent evidence scores higher than heavily assisted evidence", () => {
  const previous = { masteryScore: 0.5, confidence: 0.5, evidenceCount: 3 };
  const independent = updateMastery(previous, { value: 0.8, confidence: 0.9, assistanceLevel: 0 });
  const assisted = updateMastery(previous, { value: 0.8, confidence: 0.9, assistanceLevel: 5 });
  assert.ok(independent.masteryScore > assisted.masteryScore);
});

test("mastery level thresholds are deterministic", () => {
  assert.equal(masteryLevelFor(0.35, 4), "PRACTICING");
  assert.equal(masteryLevelFor(0.62, 4), "COMPETENT");
  assert.equal(masteryLevelFor(0.9, 6), "MASTERED");
});
