import assert from "node:assert/strict";
import test from "node:test";

import {
  RECOMMENDED_LENGTH,
  resolvePasswordLength,
} from "../src/core/generation-settings.js";

test("recommended length remains a stable compatibility default", () => {
  assert.equal(RECOMMENDED_LENGTH, 32);
  assert.equal(resolvePasswordLength("recommended", "12"), 32);
  assert.equal(resolvePasswordLength("recommended", "64"), 32);
});

test("specific length uses the explicit selection", () => {
  assert.equal(resolvePasswordLength("specific", "12"), 12);
  assert.equal(resolvePasswordLength("specific", "48"), 48);
  assert.equal(resolvePasswordLength("specific", "64"), 64);
});
