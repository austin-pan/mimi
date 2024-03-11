import PasswordGenerator from "./passwordGenerator";
import { digits, special, upper } from "../utils/symbols";
import seedrandom from "seedrandom";
import words from "../res/mediumWords.txt";
import PasswordConfig from "../config";

export default class WordPasswordGenerator extends PasswordGenerator {
  #ready = false;
  #lengthToWords = null;
  #wordMaxLength = null;
  #wordMinLength = null;

  constructor() {
    super();

    const wordBank = words.split("\n");
    this.#lengthToWords = Object.groupBy(wordBank, (word) => word.length );
    this.#wordMaxLength = Math.max(...Object.keys(this.#lengthToWords));
    this.#wordMinLength = Math.min(...Object.keys(this.#lengthToWords));
    this.#ready = true;
  }

  ready = () => {
    return this.#ready;
  }

  generate = (seed, length, config) => {
    if (!this.ready()) {
      throw new Error("Not ready");
    }
    if (isNaN(length) || length < 8 || length > 64) {
      throw new Error("Length must be between 8 and 64, inclusive");
    }

    const rng = seedrandom(seed)
    const randomWords = this.#generateWordLengths(length - 3, rng)
      .map((wordLength) => {
        const wordList = this.#lengthToWords[wordLength];
        return wordList[Math.floor(rng() * wordList.length)];
      });

    const wordsPortion = randomWords.join(" ");
    const validatorPortion = this.#generateValidator(length - wordsPortion.length - 1, rng, config);
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
  #generateWordLengths = (totalLength, rng, lengths = []) => {
    // Valid length sequence found
    if (totalLength == 0) { return lengths; }
    // Length sequence sum is too large
    if (totalLength < 0) { return null; }

    let candidateLengths = Object.keys(this.#lengthToWords);

    while (candidateLengths.length > 0) {
      const randomIndex = Math.floor(rng() * candidateLengths.length);
      const candidateLength = candidateLengths[randomIndex];

      const branchSequence = this.#generateWordLengths(
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
  #generateValidator = (length, rng, config) => {
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
}