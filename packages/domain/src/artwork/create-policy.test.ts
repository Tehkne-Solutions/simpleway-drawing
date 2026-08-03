import assert from "node:assert/strict";
import test from "node:test";
import { canCreateArtworkType, normalizeArtworkTitle } from "./create-policy";

test("baseline and exercise results cannot be created from Create", () => {
  assert.equal(canCreateArtworkType("BASELINE"), false);
  assert.equal(canCreateArtworkType("EXERCISE_RESULT"), false);
  assert.equal(canCreateArtworkType("STUDY"), true);
  assert.equal(canCreateArtworkType("PROJECT"), true);
});

test("artwork title is normalized and required", () => {
  assert.equal(normalizeArtworkTitle("  Estudo   de formas  "), "Estudo de formas");
  assert.throws(() => normalizeArtworkTitle("   "), /ARTWORK_TITLE_REQUIRED/);
});
