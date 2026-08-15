import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Croma exposes the six canonical pedagogical states", () => {
  const mark = source("app/components/croma-mark.tsx");
  for (const state of ["observe", "teach", "challenge", "correct", "celebrate", "guide"]) {
    assert.match(mark, new RegExp(`\\b${state}\\b`));
    assert.match(mark, new RegExp(`state === \\"${state}\\"`));
  }
  assert.match(mark, /data-croma-state=\{state\}/);
  assert.match(mark, /Croma ajudando a corrigir/);
  assert.match(mark, /Croma celebrando uma conquista/);
});

test("CromaCoach forwards semantic state instead of using a decorative-only mascot", () => {
  const coach = source("app/components/croma-coach.tsx");
  assert.match(coach, /state\?: CromaState/);
  assert.match(coach, /state = "teach"/);
  assert.match(coach, /data-croma-state=\{state\}/);
  assert.match(coach, /<CromaMark state=\{state\}/);
});

test("Hub and Atelier derive Croma state from the player's actual context", () => {
  const hub = source("app/page.tsx");
  const create = source("app/create/page.tsx");
  assert.match(hub, /phase === "AUTHORING" \? "celebrate" : phase === "CREATIVE_WORLD" \? "guide" : "challenge"/);
  assert.match(hub, /<CromaMark state=\{cromaState\}/);
  assert.match(create, /alphaMode \? "challenge" as const/);
  assert.match(create, /state=\{cromaState\}/);
});

test("Codex teaches all six Croma states as part of the product language", () => {
  const codex = source("app/codex/page.tsx");
  for (const state of ["observe", "teach", "challenge", "correct", "celebrate", "guide"]) {
    assert.match(codex, new RegExp(`state: \\"${state}\\"`));
  }
  assert.match(codex, /Croma Vivo · linguagem pedagógica/);
  assert.match(codex, /até uma criança que ainda lê pouco/);
});

test("Croma Vivo art layer stays authored without gradient or glow effects", () => {
  const css = source("app/croma-v1-47.css");
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|filter:|text-shadow:/);
  assert.match(css, /croma-expression-atlas/);
  assert.match(css, /croma-coach\[data-croma-state="challenge"\]/);
});
