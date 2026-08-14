import assert from "node:assert/strict";
import test from "node:test";
import { C0_LESSONS, C1_LESSONS } from "@swd/content";
import { C2_LESSONS } from "@swd/content/c2";
import { C3_LESSONS } from "@swd/content/c3";
import { C4_LESSONS } from "@swd/content/c4";
import { normalizeLearningReturnTo } from "./learning-return";

const KNOWN_PREFIXES = [
  "exercise.swd.gym.",
  "exercise.swd.observation.",
  "exercise.swd.construction.",
  "exercise.swd.form.",
] as const;

test("every Foundation Practice has an explicit Mission Player portal family", () => {
  const lessons = [...C0_LESSONS, ...C1_LESSONS, ...C2_LESSONS, ...C3_LESSONS, ...C4_LESSONS];
  const practiceKeys = lessons.flatMap((lesson) => lesson.blocks.flatMap((block) => block.type === "PRACTICE" ? [block.exerciseKey] : []));
  assert.ok(practiceKeys.length > 0, "Foundation must contain at least one Practice block");
  for (const exerciseKey of practiceKeys) {
    assert.ok(KNOWN_PREFIXES.some((prefix) => exerciseKey.startsWith(prefix)), `Practice portal family is not routed: ${exerciseKey}`);
  }
});

test("mission return paths are restricted to internal Learn routes", () => {
  assert.equal(normalizeLearningReturnTo("/learn/c1/lesson.swd.c1.line"), "/learn/c1/lesson.swd.c1.line");
  assert.equal(normalizeLearningReturnTo(encodeURIComponent("/learn/c2/lesson.swd.c2.ratio")), "/learn/c2/lesson.swd.c2.ratio");
  assert.equal(normalizeLearningReturnTo("https://malicious.example/learn/c1/x"), null);
  assert.equal(normalizeLearningReturnTo("//malicious.example"), null);
  assert.equal(normalizeLearningReturnTo("/create/pixel"), null);
  assert.equal(normalizeLearningReturnTo("/learn/c1/foo\\bar"), null);
});
