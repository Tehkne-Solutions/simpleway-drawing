import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const newStudies = [
  ["lesson.swd.c1.how_hand_moves", "public/studies/c1-joint-scales.svg"],
  ["lesson.swd.c1.curve_control", "public/studies/c1-curve-families.svg"],
  ["lesson.swd.c1.direction_parallelism", "public/studies/c1-parallel-rails.svg"],
  ["lesson.swd.c1.pressure_line_weight", "public/studies/c1-line-weight-taper.svg"],
  ["lesson.swd.c1.applied_line", "public/studies/c1-applied-line-economy.svg"],
] as const;

test("C1 motor demonstrations use five authored studies plus the canonical intentional-line plate", () => {
  const catalog = source("app/learn/foundation-visual-study-c1.ts");
  for (const [lessonKey, file] of newStudies) {
    assert.match(catalog, new RegExp(lessonKey.replaceAll(".", "\\.")));
    assert.match(catalog, new RegExp(file.replace("public", "").replaceAll("/", "\\/")));
    assert.equal(existsSync(resolve(process.cwd(), file)), true, `${file} must exist`);
  }
  assert.match(catalog, /lesson\.swd\.c1\.point_to_point/);
  assert.match(catalog, /\/studies\/c0-intentional-line\.svg/);
});

test("C1 study assets are accessible and reject gradient or glow effects", () => {
  for (const [, file] of newStudies) {
    const svg = source(file);
    assert.match(svg, /<title id="title">[^<]+<\/title>/);
    assert.match(svg, /<desc id="desc">[^<]+<\/desc>/);
    assert.match(svg, /aria-labelledby="title desc"/);
    assert.doesNotMatch(svg, /linearGradient|radialGradient|<filter|filter=|feGaussianBlur/i);
  }
});

test("shared Foundation study resolver includes C1 catalog and C1 imports the bounded study layout", () => {
  const component = source("app/learn/foundation-visual-study.tsx");
  const page = source("app/learn/c1/[lessonKey]/page.tsx");
  assert.match(component, /C1_VISUAL_STUDIES/);
  assert.match(component, /\.\.\.C1_VISUAL_STUDIES/);
  assert.match(page, /foundation-visual-study-v137\.css/);
});
