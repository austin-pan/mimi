import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  ARGON2_PARAMETERS,
  generateCharactersV2,
  generateWordsV2,
} from "../src/core/derive-v2.js";
import {
  generateCharactersV1,
  generateWordsV1,
  legacySeed,
} from "../src/core/legacy.js";

const FAST_TEST_PARAMETERS = {
  iterations: 1,
  memorySize: 512,
  parallelism: 1,
  hashLength: 32,
};

const profileSalt = Uint8Array.from({ length: 16 }, (_, index) => index);
const wordsV1 = (await fs.readFile(new URL("../public/word-bank-v1.txt", import.meta.url), "utf8"))
  .split(/\r?\n/).filter(Boolean);
const wordsV2 = (await fs.readFile(new URL("../public/word-bank-v2.txt", import.meta.url), "utf8"))
  .split(/\r?\n/).filter(Boolean);

const legacyVectors = [
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

test("legacy algorithms retain their checked-in outputs", () => {
  for (const vector of legacyVectors) {
    const seed = legacySeed(vector.input);
    assert.equal(generateCharactersV1(seed, vector.input.length), vector.characters);
    assert.equal(generateWordsV1(seed, vector.input.length, wordsV1), vector.words);
  }
});

const v2Input = {
  profileSalt,
  secret: "correct horse battery staple",
  application: "example.com",
  username: "alice@example.com",
  kind: "website",
  slot: 1,
  length: 32,
  separator: "-",
  style: "words-v2",
};

test("argon2id-v2 production parameters and outputs are frozen", async () => {
  assert.deepEqual(ARGON2_PARAMETERS, {
    iterations: 3,
    memorySize: 65_536,
    parallelism: 1,
    hashLength: 64,
  });
  assert.equal(
    await generateWordsV2(v2Input, wordsV2),
    "selfish-general-repay-telling-V6",
  );
  assert.equal(
    await generateCharactersV2({ ...v2Input, style: "characters-v2" }),
    "UAhyTJRz4fPkKn7PmMDVukj3c#iFLk@4",
  );
  assert.equal(
    await generateWordsV2({ ...v2Input, length: 42 }, wordsV2),
    "depends-popcorn-topical-divided-baptism-N7",
  );
  assert.equal(
    await generateCharactersV2({ ...v2Input, length: 20, style: "characters-v2" }),
    "Dr?R!Y3?gfw!ojAuUeeE",
  );
});

test("v2 outputs are deterministic and input-separated", async () => {
  const options = { argon2Parameters: FAST_TEST_PARAMETERS };
  const first = await generateCharactersV2(v2Input, options);
  assert.equal(await generateCharactersV2(v2Input, options), first);
  assert.notEqual(await generateCharactersV2({ ...v2Input, slot: 2 }, options), first);
  assert.notEqual(await generateCharactersV2({ ...v2Input, username: "other" }, options), first);
  assert.notEqual(await generateCharactersV2({ ...v2Input, application: "other.test" }, options), first);
});

test("every supported word length is exact and meets common character rules", async () => {
  for (const separator of ["-", "."]) {
    for (let length = 12; length <= 64; length += 1) {
      const password = await generateWordsV2(
        { ...v2Input, length, separator },
        wordsV2,
        { argon2Parameters: FAST_TEST_PARAMETERS },
      );
      assert.equal(password.length, length);
      assert.match(password, /[a-z]/);
      assert.match(password, /[A-Z]/);
      assert.match(password, /[0-9]/);
      assert.ok(password.includes(separator));
      assert.doesNotMatch(password, /\s/);
    }
  }
});

test("every supported character length is exact and meets common rules", async () => {
  for (let length = 12; length <= 64; length += 1) {
    const password = await generateCharactersV2(
      { ...v2Input, length, style: "characters-v2" },
      { argon2Parameters: FAST_TEST_PARAMETERS },
    );
    assert.equal(password.length, length);
    assert.match(password, /[a-z]/);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[0-9]/);
    assert.match(password, /[!@#$%*\-_.?]/);
    assert.doesNotMatch(password, /[\sO0Il1]/);
  }
});

test("v2 word bank adds portable pronouns without changing v1", () => {
  for (const pronoun of ["i", "me", "my", "you", "he", "him", "his", "she", "her", "it", "its", "we", "us", "our"]) {
    assert.ok(wordsV2.includes(pronoun), `${pronoun} missing from v2`);
  }
  assert.equal(wordsV1.length, 10_000);
  assert.equal(wordsV2.length, 10_014);
  assert.equal(new Set(wordsV2.map((word) => word.trim().toLocaleLowerCase("en-US"))).size, 10_014);
});
