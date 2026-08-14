import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("review timeline is derived from recognized cycles in chronological order", () => {
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /const reviewTimeline = historyVersions\.filter\(\(version\) => Boolean\(version\.reviewCycle\)\)\.slice\(\)\.reverse\(\)/);
  assert.match(page, /const activeCycleVersion = focusCycleVersion \?\? \(historyVersions\[0\]\?\.reviewCycle \? latestVersionNumber : null\)/);
  assert.match(page, /Linha de Revisão/);
  assert.match(page, /review-timeline-track/);
  assert.match(page, /aria-current=\{isActive \? "step" : undefined\}/);
  assert.match(page, /PASSAGEM \$\{index \+ 1\}/);
  assert.match(page, /cycle\.provenance === "STRUCTURED" \? "ESTRUTURADO" : "LEGADO"/);
});

test("timeline nodes preserve latest and historical canonical comparison routes", () => {
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /const isCurrent = version\.versionNumber === latestVersionNumber/);
  assert.match(page, /`\/create\/\$\{record\.artwork\.id\}#version-comparison`/);
  assert.match(page, /`\/create\/\$\{record\.artwork\.id\}\?cycle=\$\{version\.versionNumber\}#version-comparison`/);
  assert.match(page, /review-timeline-node/);
});

test("comparison derives adjacent cycles and never introduces a parallel timeline store", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  assert.match(component, /const cycleTargets = versions\.filter\(\(version\) => Boolean\(resolveReviewCycle\(version\)\)\)\.map\(\(version\) => version\.versionNumber\)/);
  assert.match(component, /const newerCycleVersion = cycleIndex > 0 \? cycleTargets\[cycleIndex - 1\] \?\? null : null/);
  assert.match(component, /const olderCycleVersion = cycleIndex >= 0 \? cycleTargets\[cycleIndex \+ 1\] \?\? null : null/);
  assert.match(component, /const previousHistoricalCycle = cycleTargets\.find\(\(versionNumber\) => versionNumber < latest\.versionNumber\) \?\? null/);
  assert.doesNotMatch(component, /localStorage.*timeline|sessionStorage.*timeline|timelineState|cycleHistoryState/);
});

test("historical stepper moves only among recognized cycles and current mode can open the nearest past cycle", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  assert.match(component, /version-cycle-stepper/);
  assert.match(component, /← Mais antigo/);
  assert.match(component, /Mais recente →/);
  assert.match(component, /disabled=\{!olderCycleVersion\}/);
  assert.match(component, /disabled=\{!newerCycleVersion\}/);
  assert.match(component, /← Rever ciclo anterior/);
  assert.match(component, /onClick=\{\(\) => openCycle\(previousHistoricalCycle\)\}/);
});

test("historical notebook images load lazily while latest remains eager", () => {
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /loading=\{index === 0 \? "eager" : "lazy"\}/);
  assert.match(page, /decoding="async"/);
});

test("review timeline styling is horizontally scalable and remains physical without glow or gradients", () => {
  const css = source("app/create/review-timeline-v129.css");
  assert.match(css, /\.review-timeline/);
  assert.match(css, /\.review-timeline-track/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /scroll-snap-type:x proximity/);
  assert.match(css, /\.review-timeline-node\.is-active/);
  assert.match(css, /\.version-cycle-stepper/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|filter:\s*drop-shadow|text-shadow/);
  const page = source("app/create/[artworkId]/page.tsx");
  assert.match(page, /import "\.\.\/review-timeline-v129\.css"/);
});
