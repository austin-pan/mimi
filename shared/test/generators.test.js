import assert from "node:assert/strict";
import test from "node:test";

import {
  ARGON2_PARAMETERS,
  generateCharactersV2,
  generateWordsV2,
} from "../core/derive-v2.js";
import {
  generateCharactersV1,
  generateWordsV1,
  legacySeed,
} from "../core/legacy.js";
import {
  FAST_TEST_PARAMETERS,
  PROFILE_SALT_FIXTURE,
  legacyVectors,
  loadWordBankAsset,
  v2BaseInput,
  v2FrozenVectors,
} from "./vectors.js";

const wordsV1 = await loadWordBankAsset("v1");
const wordsV2 = await loadWordBankAsset("v2");
const v2Input = { ...v2BaseInput, profileSalt: PROFILE_SALT_FIXTURE };

test("legacy algorithms retain their checked-in outputs", () => {
  for (const vector of legacyVectors) {
    const seed = legacySeed(vector.input);
    assert.equal(generateCharactersV1(seed, vector.input.length), vector.characters);
    assert.equal(generateWordsV1(seed, vector.input.length, wordsV1), vector.words);
  }
});

test("argon2id-v2 production parameters and outputs are frozen", async () => {
  assert.deepEqual(ARGON2_PARAMETERS, {
    iterations: 3,
    memorySize: 65_536,
    parallelism: 1,
    hashLength: 64,
  });
  assert.equal(await generateWordsV2(v2Input, wordsV2), v2FrozenVectors.words32);
  assert.equal(
    await generateCharactersV2({ ...v2Input, style: "characters-v2" }),
    v2FrozenVectors.chars32,
  );
  assert.equal(
    await generateWordsV2({ ...v2Input, length: 42 }, wordsV2),
    v2FrozenVectors.words42,
  );
  assert.equal(
    await generateCharactersV2({ ...v2Input, length: 20, style: "characters-v2" }),
    v2FrozenVectors.chars20,
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
