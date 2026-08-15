import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const states = ["observe", "focus", "curious", "teach", "challenge", "correct", "celebrate", "guide"] as const;

test("Croma exposes the complete expression and pedagogical state pack", () => {
  const mark = source("app/components/croma-mark.tsx");
  for (const state of states) {
    assert.ok(mark.includes(`state === "${state}"`), `missing authored expression for ${state}`);
  }
  assert.match(mark, /data-croma-state=\{state\}/);
  assert.match(mark, /Croma concentrado no problema/);
  assert.match(mark, /Croma curioso diante de uma descoberta/);
  assert.match(mark, /Croma ajudando a corrigir/);
  assert.match(mark, /Croma celebrando uma conquista/);
});

test("Croma preserves Core silhouette while adding Sketch and pigment variants", () => {
  const mark = source("app/components/croma-mark.tsx");
  assert.match(mark, /CromaVariant = "core" \| "sketch"/);
  assert.match(mark, /CromaPigment = "gold" \| "terracotta" \| "ultramarine" \| "veronese" \| "violet"/);
  assert.match(mark, /croma-sketch-construction/);
  assert.match(mark, /croma-theme-\$\{pigment\}/);
});

test("CromaCoach forwards semantic state and Atelier pigment", () => {
  const coach = source("app/components/croma-coach.tsx");
  assert.match(coach, /state\?: CromaState/);
  assert.match(coach, /state = "teach"/);
  assert.match(coach, /data-croma-state=\{state\}/);
  assert.match(coach, /data-croma-pigment=\{tone\}/);
  assert.match(coach, /<CromaMark state=\{state\} pigment=\{tone\}/);
});

test("Hub and Atelier derive Croma state from the player's actual context", () => {
  const hub = source("app/page.tsx");
  const create = source("app/create/page.tsx");
  assert.match(hub, /phase === "AUTHORING" \? "celebrate" : phase === "CREATIVE_WORLD" \? "guide" : "challenge"/);
  assert.match(hub, /phase === "AUTHORING" \? "violet" : phase === "CREATIVE_WORLD" \? "ultramarine" : "terracotta"/);
  assert.match(hub, /<CromaMark state=\{cromaState\} pigment=\{cromaPigment\}/);
  assert.match(create, /alphaMode \? "challenge" as const/);
  assert.match(create, /state=\{cromaState\}/);
});

test("Mission Player maps scene meaning, feedback and mastery to Croma states", () => {
  const mission = source("app/learn/lesson-player.tsx");
  assert.match(mission, /function cromaStateFor/);
  assert.match(mission, /if \(hasError\) return "correct"/);
  assert.match(mission, /block\.type === "PRACTICE"\) return "challenge"/);
  assert.match(mission, /block\.type === "HOOK"\) return "curious"/);
  assert.match(mission, /block\.type === "TEXT"\) return "focus"/);
  assert.match(mission, /return "celebrate"/);
  assert.match(mission, /cyclePigments/);
  assert.match(mission, /<CromaMark state=\{cromaState\} pigment=\{cromaPigment\}/);
});

test("Atlas changes Croma state and pigment with world progression and empty-state guidance", () => {
  const atlas = source("app/journey/page.tsx");
  assert.match(atlas, /worldComplete \? "celebrate" : foundationComplete \? "guide" : "observe"/);
  assert.match(atlas, /creativeSummary\.completed > 0 \? "violet"/);
  assert.match(atlas, /data-croma-state=\{atlasCromaState\}/);
  assert.match(atlas, /<CromaMark state=\{atlasCromaState\} pigment=\{atlasCromaPigment\}/);
  assert.match(atlas, /CromaMark state="guide" pigment="ultramarine"/);
});

test("Codex contains Croma Sketch and teaches the complete Expression Pack", () => {
  const codex = source("app/codex/page.tsx");
  for (const state of states) {
    assert.ok(codex.includes(`state: "${state}"`), `Codex missing ${state}`);
  }
  assert.match(codex, /Croma Sketch/);
  assert.match(codex, /variant="sketch"/);
  assert.match(codex, /Croma Vivo · Expression Pack/);
  assert.match(codex, /até uma criança que ainda lê pouco/);
});

test("Croma Vivo rendered evidence is part of the fail-closed Visual Smoke", () => {
  const guard = source("scripts/croma-vivo-render-guard.mjs");
  const workflow = source("../../.github/workflows/visual-smoke-audit.yml");
  for (const state of states) assert.match(guard, new RegExp(`"${state}"`));
  assert.match(guard, /data-croma-variant=\\"sketch\\"/);
  assert.match(guard, /CROMA_VIVO_RENDER_GUARD=PASS/);
  assert.match(workflow, /node apps\/web\/scripts\/croma-vivo-render-guard\.mjs/);
});

test("Croma Vivo art layer stays authored without gradient or glow effects", () => {
  const css = source("app/croma-v1-47.css");
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|filter:|text-shadow:/);
  assert.match(css, /croma-expression-atlas/);
  assert.match(css, /croma-variant-sketch/);
  assert.match(css, /croma-theme-ultramarine/);
  assert.match(css, /mission-croma-brief\[data-croma-state="challenge"\]/);
});
