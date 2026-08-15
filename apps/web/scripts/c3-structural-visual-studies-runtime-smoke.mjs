import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const assets = [
  ["/studies/c3-shape-relationships.svg", "Relações entre formas organizam a estrutura"],
  ["/studies/c3-construction-sequence.svg", "Construção aplicada do envelope ao detalhe"],
];
const lessons = ["lesson.swd.c3.relationships", "lesson.swd.c3.applied_construction"];

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

for (const [path, title] of assets) {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  await assertHttp(response, 200, `C3 visual study ${path}`);
  assert.match(response.headers.get("content-type") ?? "", /image\/svg\+xml/i);
  const svg = await response.text();
  assert.match(svg, new RegExp(`<title id="title">${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/title>`));
  assert.match(svg, /<desc id="desc">[^<]+<\/desc>/);
  assert.doesNotMatch(svg, /linearGradient|radialGradient|<filter|filter=|feGaussianBlur/i);
}

for (const lessonKey of lessons) {
  const response = await fetch(`${baseUrl}/learn/c3/${encodeURIComponent(lessonKey)}`, { cache: "no-store" });
  await assertHttp(response, 200, `C3 lesson ${lessonKey}`);
}

console.log("C3_STRUCTURAL_VISUAL_STUDIES_E2E=PASS two_authored_plates two_lesson_routes accessible_svg_metadata no_gradient_no_glow");
