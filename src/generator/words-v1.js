import words from "../res/mediumWords.txt";

import seedrandom from "seedrandom";
import { digits, special, upper } from "../utils/symbols.js";

const wordBank = words.split("\n");
const lengthToWords = Object.groupBy(wordBank, (word) => word.length);
const wordMaxLength = Math.max(...Object.keys(lengthToWords));
const wordMinLength = Math.min(...Object.keys(lengthToWords));

export const id = "words-v1";

export function generate(seed, length, config) {
  if (isNaN(length) || length < 13 || length > 64) {
    throw new Error("Length must be between 13 and 64, inclusive");
  }

  const rng = seedrandom(seed)
  const randomWords = generateWordLengths(length - 3, rng)
    .map((wordLength) => {
      const wordList = lengthToWords[wordLength];
      return wordList[Math.floor(rng() * wordList.length)];
    });

  const wordsPortion = randomWords.join(" ");
  const validatorPortion = generateValidator(length - wordsPortion.length - 1, rng, config);
  const password = wordsPortion + " " + validatorPortion;

  return password;
}

/**
 *
 * @param {int} totalLength
 * @param {seedrandom.PRNG} rng
 * @param {int[]} lengths
 * @returns
 */
function generateWordLengths(totalLength, rng, lengths = []) {
  // Valid length sequence found
  if (totalLength == 0) { return lengths; }
  // Length sequence sum is too large
  if (totalLength < 0) { return null; }

  let candidateLengths = Object.keys(lengthToWords);

  while (candidateLengths.length > 0) {
    const randomIndex = Math.floor(rng() * candidateLengths.length);
    const candidateLength = candidateLengths[randomIndex];

    const branchSequence = generateWordLengths(
      totalLength - candidateLength - 1, // -1 length for space after word
      rng,
      lengths.concat([candidateLength])
    );
    if (branchSequence !== null) { return branchSequence; }

    // Remove explored index
    candidateLengths.splice(randomIndex, 1);
  }

  // No valid length sequences for specified `totalLength`
  return null;
}

/**
 *
 * @param {*} length
 * @param {*} rng
 * @param {PasswordConfig} config
 */
function generateValidator(length, rng, config) {
  const reqAlphabet = upper.concat(special, digits);
  const generateCandidate = () => Array.from({ length }, (_v, _k) => reqAlphabet[Math.floor(rng() * reqAlphabet.length)])
    .join("");

  while (true) {
    const candidate = generateCandidate();
    if (config.validate(candidate)) {
      return candidate;
    }
  }
}