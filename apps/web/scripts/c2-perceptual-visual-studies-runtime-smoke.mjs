import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const assets = [
  ["/studies/c2-landmarks-envelope.svg", "Landmarks e envelope antes do contorno"],
  ["/studies/c2-estimate-measure-correct.svg", "Estime, desenhe, meça e corrija"],
  ["/studies/c2-visual-check.svg", "HNK Visual Check organiza a auto-checagem"],
];
const lessons = [
  "lesson.swd.c2.landmarks_envelope",
  "lesson.swd.c2.measurement",
  "lesson.swd.c2.self_check",
];

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

for (const [path, title] of assets) {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  await assertHttp(response, 200, `C2 visual study ${path}`);
  assert.match(response.headers.get("content-type") ?? "", /image\/svg\+xml/i);
  const svg = await response.text();
  assert.match(svg, new RegExp(`<title id="title">${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/title>`));
  assert.match(svg, /<desc id="desc">[^<]+<\/desc>/);
  assert.doesNotMatch(svg, /linearGradient|radialGradient|<filter|filter=|feGaussianBlur/i);
}

for (const lessonKey of lessons) {
  const response = await fetch(`${baseUrl}/learn/c2/${encodeURIComponent(lessonKey)}`, { cache: "no-store" });
  await assertHttp(response, 200, `C2 lesson ${lessonKey}`);
}

console.log("C2_PERCEPTUAL_VISUAL_STUDIES_E2E=PASS three_authored_plates three_lesson_routes accessible_svg_metadata no_gradient_no_glow");
