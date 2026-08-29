import { argon2id } from "hash-wasm";

import {
  CHARACTER_ALPHABET,
  COMMON_SPECIAL,
  DIGITS,
  LOWER,
  UPPER,
} from "./symbols.js";

export const ALGORITHM_VERSION = "argon2id-v2";
export const MIN_LENGTH = 12;
export const MAX_LENGTH = 64;
export const ARGON2_PARAMETERS = Object.freeze({
  iterations: 3,
  memorySize: 65_536,
  parallelism: 1,
  hashLength: 64,
});

const encoder = new TextEncoder();

function concatBytes(...arrays) {
  const result = new Uint8Array(arrays.reduce((sum, value) => sum + value.length, 0));
  let offset = 0;
  for (const value of arrays) {
    result.set(value, offset);
    offset += value.length;
  }
  return result;
}

function uint32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

export function validateDerivationInput(input) {
  if (!(input.profileSalt instanceof Uint8Array) || input.profileSalt.length !== 16) {
    throw new Error("The Mimi Profile must contain a 128-bit salt");
  }
  if (!input.secret) throw new Error("Enter your master secret");
  if (!input.application.trim()) throw new Error("Enter an application or device label");
  if (!input.username.trim()) throw new Error("Enter a username");
  if (!Number.isInteger(input.length) || input.length < MIN_LENGTH || input.length > MAX_LENGTH) {
    throw new Error(`Length must be between ${MIN_LENGTH} and ${MAX_LENGTH}`);
  }
  if (!Number.isInteger(input.slot) || input.slot < 1 || input.slot > 9999) {
    throw new Error("Credential version must be between 1 and 9999");
  }
  if (!['-', '.'].includes(input.separator)) {
    throw new Error("Separator must be '-' or '.'");
  }
}

function encodeContext(input) {
  // A JSON array has fixed field order and cannot collide the way space-joined
  // strings can. This exact encoding is part of argon2id-v2 compatibility.
  return encoder.encode(JSON.stringify([
    "mimi",
    2,
    input.application.normalize("NFKC"),
    input.username.normalize("NFKC"),
    input.slot,
    input.length,
    input.style,
    input.separator,
  ]));
}

async function sha256(bytes) {
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
}

async function deriveKey(input, parameters = ARGON2_PARAMETERS) {
  validateDerivationInput(input);
  const context = encodeContext(input);
  const contextHash = await sha256(concatBytes(input.profileSalt, context));
  const key = await argon2id({
    password: encoder.encode(input.secret.normalize("NFKC")),
    salt: contextHash.subarray(0, 16),
    ...parameters,
    outputType: "binary",
  });
  return { key, context };
}

class DeterministicBytes {
  constructor(key, context) {
    this.key = key;
    this.context = context;
    this.buffer = new Uint8Array();
    this.offset = 0;
    this.counter = 0;
  }

  async nextByte() {
    if (this.offset >= this.buffer.length) {
      this.buffer = await sha256(
        concatBytes(encoder.encode("mimi-expand-v2"), this.key, this.context, uint32(this.counter)),
      );
      this.counter += 1;
      this.offset = 0;
    }
    const value = this.buffer[this.offset];
    this.offset += 1;
    return value;
  }

  async index(size) {
    if (!Number.isInteger(size) || size < 1 || size > 0xffffffff) {
      throw new Error("Invalid deterministic selection size");
    }
    const byteCount = Math.max(1, Math.ceil(Math.log2(size) / 8));
    const range = 256 ** byteCount;
    const ceiling = Math.floor(range / size) * size;
    for (;;) {
      let value = 0;
      for (let index = 0; index < byteCount; index += 1) {
        value = value * 256 + await this.nextByte();
      }
      if (value < ceiling) return value % size;
    }
  }

  async pick(alphabet) {
    return alphabet[await this.index(alphabet.length)];
  }
}

async function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = await random.index(index + 1);
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

export async function generateCharactersV2(input, options = {}) {
  const { key, context } = await deriveKey(
    { ...input, style: "characters-v2" },
    options.argon2Parameters,
  );
  const random = new DeterministicBytes(key, context);
  const password = [
    await random.pick(UPPER),
    await random.pick(LOWER),
    await random.pick(DIGITS),
    await random.pick(COMMON_SPECIAL),
  ];
  while (password.length < input.length) {
    password.push(await random.pick(CHARACTER_ALPHABET));
  }
  return (await shuffle(password, random)).join("");
}

function groupWordsByLength(words) {
  const grouped = new Map();
  for (const rawWord of words) {
    const word = rawWord.trim().toLocaleLowerCase("en-US");
    if (!/^[a-z]+$/.test(word)) continue;
    if (!grouped.has(word.length)) grouped.set(word.length, []);
    grouped.get(word.length).push(word);
  }
  return grouped;
}

async function findWordLengths(target, count, lengths, random, chosen = []) {
  if (count === 0) return target === 0 ? chosen : null;
  const candidates = lengths.filter((length) => {
    const remainder = target - length;
    return remainder >= 0
      && remainder >= (count - 1) * lengths[0]
      && remainder <= (count - 1) * lengths[lengths.length - 1];
  });
  while (candidates.length > 0) {
    const index = await random.index(candidates.length);
    const length = candidates.splice(index, 1)[0];
    const result = await findWordLengths(
      target - length,
      count - 1,
      lengths,
      random,
      [...chosen, length],
    );
    if (result) return result;
  }
  return null;
}

export async function generateWordsV2(input, words, options = {}) {
  const normalizedInput = { ...input, style: "words-v2" };
  const { key, context } = await deriveKey(normalizedInput, options.argon2Parameters);
  const random = new DeterministicBytes(key, context);
  const grouped = groupWordsByLength(words);
  const lengths = [...grouped.keys()].sort((a, b) => a - b);
  if (lengths.length === 0) throw new Error("The word bank is empty");

  const preferredCount = Math.max(1, Math.floor((input.length - 2) / 7));
  const counts = [];
  for (let distance = 0; distance <= preferredCount + 2; distance += 1) {
    for (const count of [preferredCount - distance, preferredCount + distance]) {
      if (count >= 1 && !counts.includes(count)) counts.push(count);
    }
  }

  let wordLengths = null;
  for (const count of counts) {
    // There is one separator after every word, followed by an uppercase letter
    // and a digit: word-word-A7. The separator supplies the special character.
    const targetWordLength = input.length - count - 2;
    wordLengths = await findWordLengths(targetWordLength, count, lengths, random);
    if (wordLengths) break;
  }
  if (!wordLengths) throw new Error("No word layout fits this password length");

  const selectedWords = [];
  for (const length of wordLengths) {
    const candidates = grouped.get(length);
    selectedWords.push(candidates[await random.index(candidates.length)]);
  }
  const suffix = `${await random.pick(UPPER)}${await random.pick(DIGITS)}`;
  return `${selectedWords.join(input.separator)}${input.separator}${suffix}`;
}
