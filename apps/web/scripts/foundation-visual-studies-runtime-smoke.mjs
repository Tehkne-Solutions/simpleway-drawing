import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const studies = [
  {
    asset: "/studies/c0-observe-attempt-correct.svg",
    lesson: "lesson.swd.c0.what_drawing_is",
    title: "O que desenho realmente é",
    plateTitle: "Observar, tentar, comparar e corrigir",
  },
  {
    asset: "/studies/c0-intentional-line.svg",
    lesson: "lesson.swd.c0.intentional_marks",
    title: "Marcas com intenção",
    plateTitle: "Look, Plan, Ghost, Commit",
  },
  {
    asset: "/studies/c0-mug-construction.svg",
    lesson: "lesson.swd.c0.simple_construction",
    title: "Construa do grande para o pequeno",
    plateTitle: "Construa do grande para o pequeno",
  },
  {
    asset: "/studies/c0-still-life-correction.svg",
    lesson: "lesson.swd.c0.first_correction",
    title: "A primeira correção",
    plateTitle: "Corrija relações antes de detalhes",
  },
];

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

for (const study of studies) {
  const asset = await fetch(`${baseUrl}${study.asset}`, { cache: "no-store" });
  await assertHttp(asset, 200, `visual study asset ${study.asset}`);
  assert.match(asset.headers.get("content-type") ?? "", /image\/svg\+xml/i);
  const svg = await asset.text();
  assert.match(svg, new RegExp(`<title id="title">${study.plateTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/title>`));
  assert.match(svg, /<desc id="desc">[^<]+<\/desc>/);
  assert.doesNotMatch(svg, /linearGradient|radialGradient|<filter|filter=|feGaussianBlur/i);

  const lesson = await fetch(`${baseUrl}/learn/c0/${encodeURIComponent(study.lesson)}`, { cache: "no-store" });
  await assertHttp(lesson, 200, `Foundation lesson route ${study.lesson}`);
  const html = await lesson.text();
  assert.match(html, new RegExp(study.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

console.log("FOUNDATION_VISUAL_STUDIES_E2E=PASS four_authored_plates svg_delivery lesson_routes accessible_metadata no_gradient_no_glow");
