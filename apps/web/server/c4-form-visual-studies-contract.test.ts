import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const studies = [
  ["lesson.swd.c4.form_combination", "public/studies/c4-form-combination.svg"],
  ["lesson.swd.c4.self_check", "public/studies/c4-form-check.svg"],
] as const;

test("C4 demonstration lessons map to authored form study plates", () => {
  const catalog = source("app/learn/foundation-visual-study-c4.ts");
  for (const [lessonKey, file] of studies) {
    assert.match(catalog, new RegExp(lessonKey.replaceAll(".", "\\.")));
    assert.match(catalog, new RegExp(file.replace("public", "").replaceAll("/", "\\/")));
    assert.equal(existsSync(resolve(process.cwd(), file)), true, `${file} must exist`);
  }
});

test("C4 study assets are accessible and reject gradient or glow effects", () => {
  for (const [, file] of studies) {
    const svg = source(file);
    assert.match(svg, /<title id="title">[^<]+<\/title>/);
    assert.match(svg, /<desc id="desc">[^<]+<\/desc>/);
    assert.match(svg, /aria-labelledby="title desc"/);
    assert.doesNotMatch(svg, /linearGradient|radialGradient|<filter|filter=|feGaussianBlur/i);
  }
});

test("shared Foundation study resolver includes C4 catalog and C4 imports the bounded study layout", () => {
  const component = source("app/learn/foundation-visual-study.tsx");
  const page = source("app/learn/c4/[lessonKey]/page.tsx");
  assert.match(component, /C4_VISUAL_STUDIES/);
  assert.match(component, /\.\.\.C4_VISUAL_STUDIES/);
  assert.match(page, /foundation-visual-study-v137\.css/);
});
