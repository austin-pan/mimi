// Single source of golden/compatibility vectors shared by every client's test
// suite. These outputs are recovery-critical: never edit an expected value to
// make a failing change pass. A released algorithm change must use a new ID and
// add new vectors here instead.

import fs from "node:fs/promises";

export const FAST_TEST_PARAMETERS = {
  iterations: 1,
  memorySize: 512,
  parallelism: 1,
  hashLength: 32,
};

// A fixed, non-random profile salt so V2 vectors are reproducible.
export const PROFILE_SALT_FIXTURE = Uint8Array.from({ length: 16 }, (_, index) => index);

export const legacyVectors = [
  {
    input: {
      username: "alice@example.com",
      application: "example.com",
      secret: "correct horse battery staple",
      length: 32,
    },
    characters: "?QL ]d#jpY}UfO`G*z]yl@5[sLnCp>bJ",
    words: "servant sold amir staff lana 2&I",
  },
  {
    input: { username: "用户", application: "例子.测试", secret: "秘密🔐", length: 24 },
    characters: "13xCqoh<q(V'{xQ,O1FN1VK(",
    words: "across pierce jackie 7*L",
  },
  {
    input: { username: "a b", application: "c", secret: "d", length: 16 },
    characters: "^cL`7ex~|t-f[oNj",
    words: "imprint judy V*9",
  },
];

// Base V2 input without the profile salt; compose with PROFILE_SALT_FIXTURE.
export const v2BaseInput = {
  secret: "correct horse battery staple",
  application: "example.com",
  username: "alice@example.com",
  slot: 1,
  length: 32,
  separator: "-",
  style: "words-v2",
};

// Vectors were recomputed (pre-adoption, no real users affected) twice:
//   1. after removing the experimental `input.kind` field from encodeContext();
//   2. after replacing the byte-expansion step with an SP 800-108-style
//      counter-mode KDF, HMAC-SHA256(argon2Key, label ‖ context ‖ counter),
//      in place of the earlier SHA-256(label ‖ key ‖ context ‖ counter) hash.
// Both are pre-adoption corrections, not breaking algorithm changes: the
// service had no users, so no existing passwords are affected. The expansion is
// frozen again at this construction; any further change must use a new
// algorithm ID.
export const v2FrozenVectors = {
  words32: "dane-agnes-extract-frennuleon-N6",
  chars32: "AE2#@fhhQU7n*_7D4%%pCG76ZdfcsTwi",
  words42: "its-our-brekonneon-vubandool-kuthernand-J2",
  chars20: "FUtPT@9*%hq@2LoC7CW3",
};

// The words-v2 bank was expanded from 10,014 to 15,000 entries pre-adoption
// (a one-time, authorized change; see scripts/expand-wordbank.mjs). It is frozen
// again at this size.
export const WORD_BANK_V2_SIZE = 15000;

// Node-side loader for the shared word-bank assets (used by unit tests in any
// client). The browser clients load these over fetch instead.
export async function loadWordBankAsset(version) {
  const text = await fs.readFile(
    new URL(`../assets/word-bank-${version}.txt`, import.meta.url),
    "utf8",
  );
  return text.split(/\r?\n/).filter(Boolean);
}
