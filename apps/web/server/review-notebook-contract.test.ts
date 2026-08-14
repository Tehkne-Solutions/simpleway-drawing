import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("version history becomes a review notebook using the same resolved cycle truth", () => {
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /Arquivo de versões · Caderno de Revisões/);
  assert.match(page, /reviewCycle: resolveReviewCycle\(version\)/);
  assert.match(page, /reviewCycleCount/);
  assert.match(page, /CICLO V\{cycle\.baseVersionNumber\} → V\{version\.versionNumber\}/);
  assert.match(page, /cycle\.plan\.preserve/);
  assert.match(page, /cycle\.plan\.transform/);
});

test("structured historical cycles keep free reflection separate while legacy cycles stay explicit about missing reflection", () => {
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /const reflection = cycle\?\.provenance === "LEGACY" \? null : version\.notes/);
  assert.match(page, /cycle\.provenance === "STRUCTURED" \? "ESTRUTURADO" : "LEGADO"/);
  assert.match(page, /Esta versão antiga guardava plano e nota no mesmo texto; não existe reflexão livre separada para recuperar\./);
  assert.match(page, /reflection \|\| "Sem reflexão livre registrada nesta passagem\."/);
});

test("selected historical comparison exposes the cycle provenance without duplicating legacy plan as reflection", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  assert.match(component, /const selectedCycle = resolveReviewCycle\(selected\)/);
  assert.match(component, /selectedCycle\?\.provenance === "LEGACY"/);
  assert.match(component, /Plano legado preservado no Caderno de Revisões/);
  assert.match(component, /version-reference-cycle/);
});

test("review notebook styling is physical and responsive without gradients or glow", () => {
  const css = source("app/create/review-notebook-v127.css");
  assert.match(css, /\.version-cycle-record/);
  assert.match(css, /\.version-cycle-pair/);
  assert.match(css, /\.version-cycle-reflection/);
  assert.match(css, /\.version-cycle-legacy/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|filter:\s*drop-shadow|text-shadow/);
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /import "\.\.\/review-notebook-v127\.css"/);
});
