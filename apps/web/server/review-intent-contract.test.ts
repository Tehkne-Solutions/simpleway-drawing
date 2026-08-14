import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("comparison captures both review decisions locally before navigation", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  assert.match(component, /const MAX_INTENT = 280/);
  assert.match(component, /const \[preserve, setPreserve\] = useState\(""\)/);
  assert.match(component, /const \[transform, setTransform\] = useState\(""\)/);
  assert.match(component, /maxLength=\{MAX_INTENT\}/);
  assert.match(component, /const intentReady = Boolean\(preserveIntent && transformIntent\)/);
  assert.match(component, /disabled=\{!intentReady\}/);
  assert.match(component, /Levar decisão para a Câmara/);
  assert.doesNotMatch(component, /fetch\(|method:\s*"POST"|method:\s*"PUT"|method:\s*"PATCH"/);
});

test("comparison handoff is a bounded navigation to the same artwork", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  assert.match(component, /new URLSearchParams\(\{/);
  assert.match(component, /artworkId,/);
  assert.match(component, /preserve: preserveIntent\.slice\(0, MAX_INTENT\)/);
  assert.match(component, /transform: transformIntent\.slice\(0, MAX_INTENT\)/);
  assert.match(component, /router\.push\(`\/create\/work\?\$\{params\.toString\(\)\}`\)/);
});

test("Work Chamber only materializes intent after owner-scoped artwork resolution and sanitization", () => {
  const page = source("app/create/work/page.tsx");
  assert.match(page, /getArtworkRepository\(\)\.getOwned\(userId, artworkId\)/);
  assert.match(page, /const preserveIntent = \(preserve \?\? ""\)\.trim\(\)\.slice\(0, MAX_INTENT\)/);
  assert.match(page, /const transformIntent = \(transform \?\? ""\)\.trim\(\)\.slice\(0, MAX_INTENT\)/);
  assert.match(page, /const initialIntent = initialArtwork && preserveIntent && transformIntent/);
  assert.match(page, /initialIntent \? \{ initialIntent \} : \{\}/);
});

test("intent initializes process notes but a recovered local draft keeps priority", () => {
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  assert.match(canvas, /type InitialIntent = \{ preserve: string; transform: string \}/);
  assert.match(canvas, /return intent \? `Preservar: \$\{intent\.preserve\}\\nTransformar: \$\{intent\.transform\}` : fallback/);
  assert.match(canvas, /useState\(intentNotes\(initialIntent, initialArtwork\?\.notes \?\? ""\)\)/);
  const storageRead = canvas.indexOf("window.localStorage.getItem(storageKey)");
  const recoveredNotes = canvas.indexOf("setNotes(parsed.notes.slice(0, 2000))");
  assert.ok(storageRead >= 0 && recoveredNotes > storageRead, "draft notes must be restored after intent initialized state");
  assert.match(canvas, /DECISÃO TRAZIDA DA MESA/);
  assert.match(canvas, /o draft continua tendo prioridade e não é sobrescrito/);
});

test("intent becomes durable only through the existing CANVAS version note on real save", () => {
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  assert.match(canvas, /notes: notes\.trim\(\) \|\| null, source: "CANVAS"/);
  assert.match(canvas, /\/api\/artworks\/\$\{encodeURIComponent\(initialArtwork\.id\)\}\/versions/);
  assert.match(canvas, /strokesRef\.current\.length === 0/);
  assert.match(canvas, /Faça ao menos uma nova decisão antes de registrar outra versão/);
});

test("review intent styling stays physical and avoids gradients or glow", () => {
  const css = source("app/create/review-intent-v123.css");
  assert.match(css, /\.version-intent-grid/);
  assert.match(css, /\.work-review-intent/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|filter:\s*drop-shadow|text-shadow/);
});
