import seedrandom from "seedrandom";

import {
  LEGACY_ALPHABET,
  LEGACY_DIGITS,
  LEGACY_SPECIAL,
  LEGACY_UPPER,
} from "./symbols.js";

const LEGACY_VALIDATOR_ALPHABET = LEGACY_UPPER + LEGACY_SPECIAL + LEGACY_DIGITS;

function isValid(password) {
  return [...LEGACY_UPPER].some((character) => password.includes(character))
    && [...LEGACY_DIGITS].some((character) => password.includes(character))
    && [...LEGACY_SPECIAL].some((character) => password.includes(character));
}

export function generateCharactersV1(seed, length) {
  if (!Number.isInteger(length) || length < 3 || length > 64) {
    throw new Error("Length must be between 3 and 64, inclusive");
  }

  const rng = seedrandom(seed);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const password = Array.from(
      { length },
      () => LEGACY_ALPHABET[Math.floor(rng() * LEGACY_ALPHABET.length)],
    ).join("");
    if (isValid(password)) {
      return password;
    }
  }
  throw new Error("Unable to satisfy the legacy password requirements");
}

function groupWordsByLength(words) {
  const grouped = new Map();
  for (const word of words) {
    if (!grouped.has(word.length)) {
      grouped.set(word.length, []);
    }
    grouped.get(word.length).push(word);
  }
  return grouped;
}

function generateWordLengths(totalLength, rng, candidateLengths, lengths = []) {
  if (totalLength === 0) return lengths;
  if (totalLength < 0) return null;

  const candidates = [...candidateLengths];
  while (candidates.length > 0) {
    const randomIndex = Math.floor(rng() * candidates.length);
    const candidateLength = candidates[randomIndex];
    const result = generateWordLengths(
      totalLength - candidateLength - 1,
      rng,
      candidateLengths,
      [...lengths, candidateLength],
    );
    if (result !== null) return result;
    candidates.splice(randomIndex, 1);
  }
  return null;
}

function generateValidator(length, rng) {
  for (;;) {
    const candidate = Array.from(
      { length },
      () => LEGACY_VALIDATOR_ALPHABET[
        Math.floor(rng() * LEGACY_VALIDATOR_ALPHABET.length)
      ],
    ).join("");
    if (isValid(candidate)) return candidate;
  }
}

export function generateWordsV1(seed, length, words) {
  if (!Number.isInteger(length) || length < 13 || length > 64) {
    throw new Error("Length must be between 13 and 64, inclusive");
  }

  const grouped = groupWordsByLength(words);
  const candidateLengths = [...grouped.keys()].sort((a, b) => a - b);
  const rng = seedrandom(seed);
  const wordLengths = generateWordLengths(length - 3, rng, candidateLengths);
  if (!wordLengths) throw new Error("No legacy word layout fits this length");

  const selectedWords = wordLengths.map((wordLength) => {
    const candidates = grouped.get(wordLength);
    return candidates[Math.floor(rng() * candidates.length)];
  });
  const wordsPortion = selectedWords.join(" ");
  const validator = generateValidator(length - wordsPortion.length - 1, rng);
  return `${wordsPortion} ${validator}`;
}

export function legacySeed({ username, application, secret }) {
  return [username, application, secret].join(" ");
}
