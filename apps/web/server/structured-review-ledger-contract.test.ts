import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("review plan has one bounded domain contract shared by UI, API and repository", () => {
  const domain = source("../../packages/domain/src/artwork/review-plan.ts");
  const index = source("../../packages/domain/src/index.ts");
  const api = source("app/api/artworks/[artworkId]/versions/route.ts");
  const repository = source("../../packages/database/src/repositories/artworks.ts");
  assert.match(domain, /REVIEW_PLAN_DECISION_MAX_LENGTH = 280/);
  assert.match(domain, /baseVersionNumber: number/);
  assert.match(domain, /normalizeArtworkReviewPlan/);
  assert.match(index, /export \* from "\.\/artwork\/review-plan"/);
  assert.match(api, /normalizeArtworkReviewPlan\(body\.reviewPlan\)/);
  assert.match(repository, /normalizeArtworkReviewPlan\(input\.reviewPlan\)/);
});

test("repository is authoritative for source and base version before writing review plan", () => {
  const repository = source("../../packages/database/src/repositories/artworks.ts");
  assert.match(repository, /reviewPlan && \(input\.source !== "CANVAS" \|\| reviewPlan\.baseVersionNumber !== latestVersionNumber\)/);
  assert.match(repository, /throw new Error\("INVALID_REVIEW_PLAN"\)/);
  assert.match(repository, /const journeyMetadata = reviewPlan \? \{ versionNumber: next, reviewPlan \} : \{ versionNumber: next \}/);
  assert.match(repository, /type: "ARTWORK_VERSION"/);
  assert.match(repository, /metadata: journeyMetadata/);
});

test("structured plan reuses Journey JSONB and does not alter the frozen artwork_versions schema", () => {
  const core = source("../../packages/database/src/schema/core.ts");
  const journey = source("../../packages/database/src/schema/journey.ts");
  const start = core.indexOf("export const artworkVersions");
  const end = core.indexOf("export const exerciseAttempts", start);
  const artworkVersionBlock = core.slice(start, end);
  assert.match(artworkVersionBlock, /notes: text\("notes"\)/);
  assert.doesNotMatch(artworkVersionBlock, /reviewPlan|review_plan/);
  assert.match(journey, /metadata: jsonb\("metadata"\)\.notNull\(\)\.default\(\{\}\)/);
});

test("owned artwork detail reconstructs and exposes plan by immutable version event", () => {
  const repository = source("../../packages/database/src/repositories/artworks.ts");
  const detailApi = source("app/api/artworks/[artworkId]/route.ts");
  const detailPage = source("app/create/[artworkId]/page.tsx");
  assert.match(repository, /eq\(journeyEntries\.type, "ARTWORK_VERSION"\)/);
  assert.match(repository, /reviewPlanFromJourneyMetadata\(event\.metadata, versionNumber\)/);
  assert.match(repository, /reviewPlans\.get\(version\.versionNumber\) \?\? null/);
  assert.match(detailApi, /reviewPlan: version\.reviewPlan/);
  assert.match(detailPage, /reviewPlan: version\.reviewPlan/);
});

test("free reflection and structured review plan are separate on CANVAS save", () => {
  const chamber = source("app/create/work/work-chamber-canvas.tsx");
  const chamberPage = source("app/create/work/page.tsx");
  assert.match(chamber, /const \[notes, setNotes\] = useState\(""\)/);
  assert.match(chamber, /Reflexão da passagem/);
  assert.match(chamber, /notes: notes\.trim\(\) \|\| null, source: "CANVAS", reviewPlan: reviewIntent/);
  assert.doesNotMatch(chamber, /intentNotes/);
  assert.doesNotMatch(chamberPage, /notes: current\.notes/);
  assert.match(chamberPage, /reflexão desta nova passagem começa limpa/);
});

test("review plan is not duplicated into the outbox payload", () => {
  const repository = source("../../packages/database/src/repositories/artworks.ts");
  const outboxStart = repository.indexOf('eventType: "drawing.artwork.version_added.v1"');
  const outboxEnd = repository.indexOf("return { ...version, reviewPlan }", outboxStart);
  const outboxBlock = repository.slice(outboxStart, outboxEnd);
  assert.doesNotMatch(outboxBlock, /reviewPlan/);
});
