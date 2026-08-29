import assert from "node:assert/strict";
import test from "node:test";

import { profileCodeFromHash } from "../../shared/core/profile-link.js";

test("profile links decode on initial and same-document navigation", () => {
  const code = "MIMI1-AAASE-A2EAW-DAQCA-KBJFS-2DJQB-8524";
  assert.equal(profileCodeFromHash(`#profile=${code}`), code);
  assert.equal(profileCodeFromHash(`#profile=${encodeURIComponent(code)}`), code);
  assert.equal(profileCodeFromHash(""), null);
  assert.equal(profileCodeFromHash("#something=else"), null);
});
