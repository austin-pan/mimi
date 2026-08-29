import assert from "node:assert/strict";
import test from "node:test";

import { formatProfileCode, parseProfileCode } from "../src/core/profile.js";

test("profile code round-trips with a frozen representation", async () => {
  const salt = Uint8Array.from({ length: 16 }, (_, index) => index);
  const code = await formatProfileCode(salt);
  assert.equal(code, "MIMI1-AAASE-A2EAW-DAQCA-KBJFS-2DJQB-8524");
  const parsed = await parseProfileCode(code.toLowerCase().replaceAll("-", " "));
  assert.deepEqual(parsed.profileSalt, salt);
  assert.equal(parsed.code, code);
});

test("profile code rejects corruption", async () => {
  await assert.rejects(
    parseProfileCode("MIMI1-AAASE-A2EAW-DAQCA-KBJFS-2DJQB-8525"),
    /checksum|canonically encoded/,
  );
  await assert.rejects(parseProfileCode("not-a-profile"), /start with MIMI1/);
});
