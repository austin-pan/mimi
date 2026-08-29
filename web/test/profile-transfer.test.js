import assert from "node:assert/strict";
import test from "node:test";

import { profileQrSvg } from "../src/core/qr.js";
import {
  PROFILE_FILE_EXTENSION,
  buildProfileFile,
  parseProfileFile,
} from "../src/core/profile-file.js";

const SAMPLE_CODE = "MIMI1-ABCDE-FGHJK-LMNPQ-RSTUV-WXYZ2-34567";

test("profileQrSvg encodes text into a scannable SVG", () => {
  const svg = profileQrSvg(SAMPLE_CODE);
  assert.match(svg, /^<svg /);
  assert.match(svg, /<path d="M/);
  assert.match(svg, /role="img"/);
  // Dark-on-light so the code stays scannable regardless of app theme.
  assert.match(svg, /fill="#ffffff"/);
});

test("profileQrSvg rejects empty input", () => {
  assert.throws(() => profileQrSvg(""), /Nothing to encode/);
});

test("buildProfileFile carries only the public code with the right extension", () => {
  const file = buildProfileFile(SAMPLE_CODE);
  assert.ok(file.filename.endsWith(PROFILE_FILE_EXTENSION));
  const parsed = JSON.parse(file.contents);
  assert.equal(parsed.code, SAMPLE_CODE);
  assert.equal(parsed.type, "mimi-profile");
  assert.doesNotMatch(file.contents, /secret|password/i);
});

test("profile file round-trips through build and parse", () => {
  const file = buildProfileFile(SAMPLE_CODE);
  assert.equal(parseProfileFile(file.contents), SAMPLE_CODE);
});

test("parseProfileFile accepts a raw Profile Code saved as plain text", () => {
  assert.equal(parseProfileFile(`  ${SAMPLE_CODE}\n`), SAMPLE_CODE);
});

test("parseProfileFile rejects unrelated content", () => {
  assert.throws(() => parseProfileFile("just some text"), /does not look like/);
  assert.throws(() => parseProfileFile("{}"), /does not contain a Profile Code/);
  assert.throws(() => parseProfileFile(""), /empty/);
});
