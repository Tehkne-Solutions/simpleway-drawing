import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const assets = [
  ["/studies/c4-form-combination.svg", "Combine volumes antes de refinar a silhueta"],
  ["/studies/c4-form-check.svg", "HNK Form Check testa coerência espacial"],
];
const lessons = ["lesson.swd.c4.form_combination", "lesson.swd.c4.self_check"];

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

for (const [path, title] of assets) {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  await assertHttp(response, 200, `C4 visual study ${path}`);
  assert.match(response.headers.get("content-type") ?? "", /image\/svg\+xml/i);
  const svg = await response.text();
  assert.match(svg, new RegExp(`<title id="title">${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/title>`));
  assert.match(svg, /<desc id="desc">[^<]+<\/desc>/);
  assert.doesNotMatch(svg, /linearGradient|radialGradient|<filter|filter=|feGaussianBlur/i);
}

for (const lessonKey of lessons) {
  const response = await fetch(`${baseUrl}/learn/c4/${encodeURIComponent(lessonKey)}`, { cache: "no-store" });
  await assertHttp(response, 200, `C4 lesson ${lessonKey}`);
}

console.log("C4_FORM_VISUAL_STUDIES_E2E=PASS two_authored_plates two_lesson_routes accessible_svg_metadata no_gradient_no_glow");
