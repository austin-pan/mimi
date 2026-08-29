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
  kind: "website",
  slot: 1,
  length: 32,
  separator: "-",
  style: "words-v2",
};

export const v2FrozenVectors = {
  words32: "selfish-general-repay-telling-V6",
  chars32: "UAhyTJRz4fPkKn7PmMDVukj3c#iFLk@4",
  words42: "depends-popcorn-topical-divided-baptism-N7",
  chars20: "Dr?R!Y3?gfw!ojAuUeeE",
};

// Node-side loader for the shared word-bank assets (used by unit tests in any
// client). The browser clients load these over fetch instead.
export async function loadWordBankAsset(version) {
  const text = await fs.readFile(
    new URL(`../assets/word-bank-${version}.txt`, import.meta.url),
    "utf8",
  );
  return text.split(/\r?\n/).filter(Boolean);
}
