import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Foundation completion requires authoritative Practice Evidence", () => {
  const helper = source("server/foundation-mission-state.ts");
  const stateRoute = source("app/api/learning/lessons/[lessonKey]/mission-state/route.ts");
  const completeRoute = source("app/api/learning/lessons/[lessonKey]/complete/route.ts");

  assert.match(helper, /exerciseAttempts/);
  assert.match(helper, /status, "SUBMITTED"/);
  assert.match(helper, /lessonPracticeKeys/);
  assert.match(helper, /hasDrawingZero/);
  assert.match(helper, /ready = practices\.every/);
  assert.match(stateRoute, /getFoundationMissionState/);
  assert.match(stateRoute, /cache-control/);
  assert.match(completeRoute, /getFoundationMissionState/);
  assert.match(completeRoute, /LESSON_PRACTICE_REQUIRED/);
  assert.match(completeRoute, /exerciseKey: missingPractice\.exerciseKey/);
});

test("Foundation lesson UI is a staged viewport mission instead of a vertical lesson document", () => {
  const player = source("app/learn/lesson-player.tsx");
  const css = source("app/learn/mission-player-v16.css");
  const shell = source("app/app-shell.tsx");

  assert.match(player, /sceneIndex/);
  assert.match(player, /visited/);
  assert.match(player, /sessionStorage/);
  assert.match(player, /mission-state/);
  assert.match(player, /Portal de Practice/);
  assert.match(player, /LESSON_PRACTICE_REQUIRED/);
  assert.match(player, /missionState\?\.practices/);
  assert.match(player, /missionState\?\.drawingZeroComplete/);
  assert.match(player, /allReflectionsResolved/);
  assert.match(player, /lesson\.blocks\.every\(\(_, index\) => isResolved\(index\)\)/);
  assert.match(player, /returnTo=/);
  assert.doesNotMatch(player, /lesson\.blocks\.map\(\(block, index\) => \{\s*if \(block\.type === "HOOK"\)/);

  assert.match(css, /height:100%/);
  assert.match(css, /foundation-mission-stage/);
  assert.match(css, /mission-scene-rail/);
  assert.match(css, /mission-croma-brief/);
  assert.match(shell, /lessonWorkspace = \/\^\\\/learn\\\/c\[0-4\]\\\//);
  assert.match(shell, /\|\| lessonWorkspace/);
});

test("all Foundation cycles render the Mission Player directly", () => {
  for (const cycle of ["c0", "c1", "c2", "c3", "c4"]) {
    const page = source(`app/learn/${cycle}/[lessonKey]/page.tsx`);
    assert.match(page, /FoundationLessonPlayer/);
    assert.match(page, /lessonIndex=\{index\}/);
    assert.match(page, /lessonCount=/);
    assert.doesNotMatch(page, /flow-card/);
  }
});

test("Practice portals target the requested exercise and return to the mission safely", () => {
  const player = source("app/learn/lesson-player.tsx");
  const observationPage = source("app/observation/page.tsx");
  const constructionPage = source("app/construction/page.tsx");
  const formPage = source("app/form/page.tsx");
  const gymPage = source("app/gym/page.tsx");
  const observation = source("app/observation/observation-client.tsx");
  const construction = source("app/construction/construction-client.tsx");
  const form = source("app/form/form-client.tsx");
  const gym = source("app/gym/motor-drill-client.tsx");
  const drawingZero = source("app/drawing-zero/drawing-zero-form.tsx");
  const returnGuard = source("server/learning-return.ts");

  assert.match(player, /exercise=\$\{encodeURIComponent\(exerciseKey\)\}/);
  assert.match(player, /returnTo=\$\{encodeURIComponent\(returnTo\)\}/);
  assert.match(observationPage, /initialExerciseKey/);
  assert.match(constructionPage, /initialExerciseKey/);
  assert.match(formPage, /initialExerciseKey/);
  assert.match(gymPage, /returnTo/);
  assert.match(observation, /Retornar com Evidence/);
  assert.match(construction, /Retornar com Evidence/);
  assert.match(form, /Retornar com Evidence/);
  assert.match(gym, /Retornar com Evidence/);
  assert.match(drawingZero, /Retornar à missão/);
  assert.match(returnGuard, /startsWith\("\/learn\/"\)/);
  assert.match(returnGuard, /decoded\.includes\("\\\\"\)/);
});
