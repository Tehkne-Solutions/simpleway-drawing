import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const assets = [
  ["/studies/c1-joint-scales.svg", "Pulso, cotovelo e ombro mudam a escala do gesto"],
  ["/studies/c1-curve-families.svg", "Famílias de curvas C e S"],
  ["/studies/c1-parallel-rails.svg", "Rails paralelos mantêm direção e espaçamento"],
  ["/studies/c1-line-weight-taper.svg", "Pressão e velocidade controlam line weight"],
  ["/studies/c1-applied-line-economy.svg", "Line economy usa menos marcas com mais intenção"],
];
const lessons = [
  "lesson.swd.c1.how_hand_moves",
  "lesson.swd.c1.point_to_point",
  "lesson.swd.c1.curve_control",
  "lesson.swd.c1.direction_parallelism",
  "lesson.swd.c1.pressure_line_weight",
  "lesson.swd.c1.applied_line",
];

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

for (const [path, title] of assets) {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  await assertHttp(response, 200, `C1 visual study ${path}`);
  assert.match(response.headers.get("content-type") ?? "", /image\/svg\+xml/i);
  const svg = await response.text();
  assert.match(svg, new RegExp(`<title id="title">${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/title>`));
  assert.match(svg, /<desc id="desc">[^<]+<\/desc>/);
  assert.doesNotMatch(svg, /linearGradient|radialGradient|<filter|filter=|feGaussianBlur/i);
}

const reused = await fetch(`${baseUrl}/studies/c0-intentional-line.svg`, { cache: "no-store" });
await assertHttp(reused, 200, "C1 reused intentional line study");

for (const lessonKey of lessons) {
  const response = await fetch(`${baseUrl}/learn/c1/${encodeURIComponent(lessonKey)}`, { cache: "no-store" });
  await assertHttp(response, 200, `C1 lesson ${lessonKey}`);
}

console.log("C1_MOTOR_VISUAL_STUDIES_E2E=PASS five_new_plates one_reused_plate six_lesson_routes accessible_svg_metadata no_gradient_no_glow");
