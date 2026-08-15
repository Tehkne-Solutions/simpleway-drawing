import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const studies = [
  ["lesson.swd.c0.what_drawing_is", "public/studies/c0-observe-attempt-correct.svg"],
  ["lesson.swd.c0.intentional_marks", "public/studies/c0-intentional-line.svg"],
  ["lesson.swd.c0.simple_construction", "public/studies/c0-mug-construction.svg"],
  ["lesson.swd.c0.first_correction", "public/studies/c0-still-life-correction.svg"],
] as const;

test("four C0 demonstrations map to authored local visual study plates", () => {
  const component = source("app/learn/foundation-visual-study.tsx");
  for (const [lessonKey, file] of studies) {
    assert.match(component, new RegExp(lessonKey.replaceAll(".", "\\.")));
    assert.match(component, new RegExp(file.replace("public", "").replaceAll("/", "\\/")));
    assert.equal(existsSync(resolve(process.cwd(), file)), true, `${file} must exist`);
  }
  assert.match(component, /<img src=\{study\.src\} alt=\{study\.alt\}/);
  assert.match(component, /PRANCHA DE ESTUDO/);
});

test("Foundation demonstration renders the visual study before the textual step ledger", () => {
  const player = source("app/learn/lesson-player.tsx");
  const demo = player.slice(player.indexOf('if (block.type === "DEMONSTRATION")'), player.indexOf('if (block.type === "CHECKPOINT")'));
  assert.match(player, /import \{ FoundationVisualStudy \} from "\.\/foundation-visual-study"/);
  assert.match(demo, /<FoundationVisualStudy lessonKey=\{lesson\.key\} \/>/);
  assert.ok(demo.indexOf("FoundationVisualStudy") < demo.indexOf("mission-demo-steps"), "visual study must precede the numbered steps");
});

test("study plates carry accessible SVG metadata and reject decorative gradient/glow effects", () => {
  for (const [, file] of studies) {
    const svg = source(file);
    assert.match(svg, /<title id="title">[^<]+<\/title>/);
    assert.match(svg, /<desc id="desc">[^<]+<\/desc>/);
    assert.match(svg, /aria-labelledby="title desc"/);
    assert.doesNotMatch(svg, /linearGradient|radialGradient|<filter|filter=|feGaussianBlur/i);
  }
});

test("C0 visual study layout is viewport-bounded and keeps images undistorted", () => {
  const page = source("app/learn/c0/[lessonKey]/page.tsx");
  const css = source("app/learn/foundation-visual-study-v137.css");
  assert.match(page, /foundation-visual-study-v137\.css/);
  assert.match(css, /\.mission-visual-study-frame\{[^}]*height:min\(30vh,285px\)/);
  assert.match(css, /\.mission-visual-study img\{[^}]*object-fit:contain/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.doesNotMatch(css, /gradient|filter:\s*drop-shadow|text-shadow/i);
});
