import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("comparison captures both review decisions locally without putting creative text in the URL", () => {
  const component = source("app/create/[artworkId]/version-comparison.tsx");
  assert.match(component, /REVIEW_PLAN_DECISION_MAX_LENGTH/);
  assert.match(component, /const REVIEW_INTENT_PREFIX = "swd\.create\.review-intent\.v1"/);
  assert.match(component, /const \[preserve, setPreserve\] = useState\(""\)/);
  assert.match(component, /const \[transform, setTransform\] = useState\(""\)/);
  assert.match(component, /maxLength=\{REVIEW_PLAN_DECISION_MAX_LENGTH\}/);
  assert.match(component, /const intentReady = Boolean\(preserveIntent && transformIntent\)/);
  assert.match(component, /baseVersionNumber: current\.versionNumber/);
  assert.match(component, /window\.sessionStorage\.setItem\(`/);
  assert.match(component, /router\.push\(`\/create\/work\?artworkId=\$\{encodeURIComponent\(artworkId\)\}`\)/);
  assert.doesNotMatch(component, /new URLSearchParams/);
  const routerTarget = component.match(/router\.push\(([^;]+)\);/)?.[1] ?? "";
  assert.match(routerTarget, /artworkId/);
  assert.doesNotMatch(routerTarget, /preserve|transform/);
  assert.doesNotMatch(component, /fetch\(|method:\s*"POST"|method:\s*"PUT"|method:\s*"PATCH"/);
});

test("legacy review intent query params are removed before Work Chamber rendering", () => {
  const middleware = source("middleware.ts");
  assert.match(middleware, /legacyReviewIntentParams = \["preserve", "transform"\]/);
  assert.match(middleware, /request\.nextUrl\.pathname === "\/create\/work"/);
  assert.match(middleware, /canonical\.searchParams\.delete\(param\)/);
  assert.match(middleware, /NextResponse\.redirect\(canonical, 307\)/);
  assert.match(middleware, /matcher: \["\/api\/:path\*", "\/create\/work"\]/);
});

test("Work Chamber HTTP boundary receives only artworkId and resolves ownership before client hydration", () => {
  const page = source("app/create/work/page.tsx");
  assert.match(page, /searchParams: Promise<\{ artworkId\?: string \}>/);
  assert.match(page, /const \{ artworkId \} = await searchParams/);
  assert.match(page, /getArtworkRepository\(\)\.getOwned\(userId, artworkId\)/);
  assert.doesNotMatch(page, /preserve\?: string|transform\?: string|preserveIntent|transformIntent|initialIntent/);
  assert.match(page, /reflexão desta nova passagem começa limpa/);
});

test("Work Chamber consumes private intent only for the same artwork version and never over an existing draft", () => {
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  assert.match(canvas, /type ReviewIntent = ArtworkReviewPlan/);
  assert.match(canvas, /REVIEW_INTENT_PREFIX = "swd\.create\.review-intent\.v1"/);
  assert.match(canvas, /normalizeArtworkReviewPlan\(value\)/);
  assert.match(canvas, /intent && intent\.baseVersionNumber === expectedVersion/);
  assert.match(canvas, /window\.sessionStorage\.getItem\(reviewIntentKey\)/);
  assert.match(canvas, /window\.sessionStorage\.removeItem\(reviewIntentKey\)/);
  assert.match(canvas, /if \(!recoveredDraft\)/);
  assert.match(canvas, /if \(privateIntent\) setReviewIntent\(privateIntent\)/);
  assert.doesNotMatch(canvas, /setNotes\(intentNotes/);
  assert.match(canvas, /reviewIntent\?: ReviewIntent/);
  assert.match(canvas, /sanitizeReviewIntent\(parsed\.reviewIntent, initialArtwork\.versionNumber\)/);
  assert.match(canvas, /DECISÃO TRAZIDA DA MESA/);
});

test("accepted intent becomes local draft state and durable structured data only through a real CANVAS save", () => {
  const canvas = source("app/create/work/work-chamber-canvas.tsx");
  assert.match(canvas, /const draft: Draft = \{[\s\S]*\.\.\.\(reviewIntent \? \{ reviewIntent \} : \{\}\)/);
  assert.match(canvas, /window\.localStorage\.setItem\(storageKey, JSON\.stringify\(draft\)\)/);
  assert.match(canvas, /notes: notes\.trim\(\) \|\| null, source: "CANVAS", reviewPlan: reviewIntent/);
  assert.match(canvas, /\/api\/artworks\/\$\{encodeURIComponent\(initialArtwork\.id\)\}\/versions/);
  assert.match(canvas, /strokesRef\.current\.length === 0/);
  assert.match(canvas, /Faça ao menos uma nova decisão antes de registrar outra versão/);
  assert.match(canvas, /const \[notes, setNotes\] = useState\(""\)/);
  assert.match(canvas, /Reflexão da passagem/);
});

test("review intent styling stays physical and avoids gradients or glow", () => {
  const css = source("app/create/review-intent-v123.css");
  assert.match(css, /\.version-intent-grid/);
  assert.match(css, /\.work-review-intent/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|filter:\s*drop-shadow|text-shadow/);
});
