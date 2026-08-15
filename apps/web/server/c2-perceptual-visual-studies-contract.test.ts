import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const studies = [
  ["lesson.swd.c2.landmarks_envelope", "public/studies/c2-landmarks-envelope.svg"],
  ["lesson.swd.c2.measurement", "public/studies/c2-estimate-measure-correct.svg"],
  ["lesson.swd.c2.self_check", "public/studies/c2-visual-check.svg"],
] as const;

test("C2 demonstration lessons map to authored perceptual study plates", () => {
  const catalog = source("app/learn/foundation-visual-study-c2.ts");
  for (const [lessonKey, file] of studies) {
    assert.match(catalog, new RegExp(lessonKey.replaceAll(".", "\\.")));
    assert.match(catalog, new RegExp(file.replace("public", "").replaceAll("/", "\\/")));
    assert.equal(existsSync(resolve(process.cwd(), file)), true, `${file} must exist`);
  }
});

test("C2 study assets are accessible and reject gradient or glow effects", () => {
  for (const [, file] of studies) {
    const svg = source(file);
    assert.match(svg, /<title id="title">[^<]+<\/title>/);
    assert.match(svg, /<desc id="desc">[^<]+<\/desc>/);
    assert.match(svg, /aria-labelledby="title desc"/);
    assert.doesNotMatch(svg, /linearGradient|radialGradient|<filter|filter=|feGaussianBlur/i);
  }
});

test("shared Foundation study resolver includes C2 catalog and C2 imports the bounded study layout", () => {
  const component = source("app/learn/foundation-visual-study.tsx");
  const page = source("app/learn/c2/[lessonKey]/page.tsx");
  assert.match(component, /C2_VISUAL_STUDIES/);
  assert.match(component, /\.\.\.C2_VISUAL_STUDIES/);
  assert.match(page, /foundation-visual-study-v137\.css/);
});
