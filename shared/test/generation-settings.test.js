import assert from "node:assert/strict";
import test from "node:test";

import {
  getRecommendedLength,
  getStrengthGuidance,
  RECOMMENDED_LENGTHS,
  resolvePasswordLength,
} from "../core/generation-settings.js";

test("recommended lengths are style-specific and stable", () => {
  assert.deepEqual(RECOMMENDED_LENGTHS, {
    "words-v2": 42,
    "characters-v2": 20,
    "words-v1": 32,
    "characters-v1": 32,
  });
  assert.equal(getRecommendedLength("words-v2"), 42);
  assert.equal(getRecommendedLength("characters-v2"), 20);
  assert.equal(resolvePasswordLength("recommended", "12", "words-v2"), 42);
  assert.equal(resolvePasswordLength("recommended", "64", "characters-v2"), 20);
});

test("specific length uses the explicit selection", () => {
  assert.equal(resolvePasswordLength("specific", "12", "words-v2"), 12);
  assert.equal(resolvePasswordLength("specific", "48", "characters-v2"), 48);
  assert.equal(resolvePasswordLength("specific", "64", "words-v2"), 64);
});

test("strength guidance depends on generator design, not sample appearance", () => {
  assert.equal(getStrengthGuidance("words-v2", 42).level, "recommended");
  assert.equal(getStrengthGuidance("words-v2", 32).level, "good");
  assert.equal(getStrengthGuidance("words-v2", 31).level, "short");
  assert.equal(getStrengthGuidance("characters-v2", 20).level, "recommended");
  assert.equal(getStrengthGuidance("characters-v2", 16).level, "good");
  assert.equal(getStrengthGuidance("characters-v2", 15).level, "short");
  assert.equal(getStrengthGuidance("words-v1", 32).level, "compatibility");
});
