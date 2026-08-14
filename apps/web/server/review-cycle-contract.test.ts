import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { parseReviewCyclePlan, resolveReviewCycle } from "../app/create/review-cycle";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("review-cycle parser remains a strict compatibility reader for legacy notes", () => {
  assert.deepEqual(parseReviewCyclePlan("Preservar: silhueta simples\nTransformar: peso das linhas"), {
    preserve: "silhueta simples",
    transform: "peso das linhas",
  });
  assert.deepEqual(parseReviewCyclePlan("  Preservar:  espaço negativo  \nTransformar:  contraste focal  "), {
    preserve: "espaço negativo",
    transform: "contraste focal",
  });
});

test("legacy parser fails closed for partial, reordered, expanded or oversized notes", () => {
  assert.equal(parseReviewCyclePlan(null), null);
  assert.equal(parseReviewCyclePlan("Preservar: silhueta"), null);
  assert.equal(parseReviewCyclePlan("Transformar: linhas\nPreservar: silhueta"), null);
  assert.equal(parseReviewCyclePlan("Preservar: silhueta\nTransformar: linhas\nComentário: extra"), null);
  assert.equal(parseReviewCyclePlan("Preservar:   \nTransformar: linhas"), null);
  assert.equal(parseReviewCyclePlan(`Preservar: ${"a".repeat(281)}\nTransformar: linhas`), null);
});

test("shared resolver prefers a valid structured plan and preserves its base version", () => {
  assert.deepEqual(resolveReviewCycle({
    versionNumber: 3,
    source: "CANVAS",
    notes: "reflexão livre",
    reviewPlan: { preserve: "silhueta", transform: "contraste", baseVersionNumber: 2 },
  }), {
    plan: { preserve: "silhueta", transform: "contraste" },
    baseVersionNumber: 2,
    provenance: "STRUCTURED",
  });
});

test("shared resolver falls back to legacy note only when structured data cannot describe the transition", () => {
  assert.deepEqual(resolveReviewCycle({
    versionNumber: 2,
    source: "CANVAS",
    notes: "Preservar: gesto\nTransformar: peso",
    reviewPlan: { preserve: "inválido para esta versão", transform: "ignorar", baseVersionNumber: 9 },
  }), {
    plan: { preserve: "gesto", transform: "peso" },
    baseVersionNumber: 1,
    provenance: "LEGACY",
  });
  assert.equal(resolveReviewCycle({ versionNumber: 1, source: "CANVAS", notes: "Preservar: a\nTransformar: b", reviewPlan: null }), null);
  assert.equal(resolveReviewCycle({ versionNumber: 2, source: "UPLOAD", notes: "Preservar: a\nTransformar: b", reviewPlan: null }), null);
});

test("Mesa and historical notebook use the same resolver instead of parallel review-cycle logic", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(component, /const requestedCycle = requestedTarget \? resolveReviewCycle\(requestedTarget\) : null/);
  assert.match(component, /const targetCycle = historicalContext\?\.cycle \?\? resolveReviewCycle\(target\)/);
  assert.match(component, /const selectedCycle = resolveReviewCycle\(selected\)/);
  assert.doesNotMatch(component, /parseReviewCyclePlan/);
  assert.match(page, /reviewCycle: resolveReviewCycle\(version\)/);
  assert.match(component, /CICLO DE REVISÃO · V/);
  assert.match(component, /RESULTADO VISÍVEL/);
  assert.match(component, /A Mesa não decide se a intenção foi cumprida/);
  assert.match(component, /não existe nota automática de qualidade/);
});

test("review-cycle ledger remains visual evidence reading rather than automated grading", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  const ledger = component.slice(component.indexOf("review-cycle-ledger"), component.indexOf("version-wipe-station"));
  assert.doesNotMatch(ledger, /score|mastery|grade|rating/i);
  assert.doesNotMatch(ledger, /fetch\(|method:\s*"POST"|method:\s*"PUT"|method:\s*"PATCH"/);
});

test("review-cycle styling is physical, responsive and has no gradient or glow", () => {
  const css = source("app/create/review-cycle-v125.css");
  assert.match(css, /\.review-cycle-ledger/);
  assert.match(css, /\.review-cycle-decisions/);
  assert.match(css, /grid-template-columns:1fr 1fr/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|filter:\s*drop-shadow|text-shadow/);
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /import "\.\.\/review-cycle-v125\.css"/);
});
