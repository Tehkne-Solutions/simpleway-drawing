import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("visual-only labs do not require a database just to render", () => {
  const construction = source("app/construction/page.tsx");
  const observation = source("app/observation/page.tsx");
  const observationClient = source("app/observation/observation-client.tsx");

  assert.match(construction, /CONSTRUCTION_EXERCISES/);
  assert.doesNotMatch(construction, /getConstructionRepository/);

  assert.match(observation, /OBSERVATION_EXERCISES/);
  assert.doesNotMatch(observation, /getObservationRepository/);
  assert.match(observation, /SWD_LOCAL_UI_ONLY/);
  assert.match(observationClient, /localUiOnly/);
  assert.match(observationClient, /Não persistido/);
});
