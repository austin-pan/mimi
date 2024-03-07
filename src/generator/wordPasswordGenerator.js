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

    fetch(words)
      .then(res => res.text())
      .then(text => {
        const wordBank = text.split("\n");
        this.#lengthToWords = Object.groupBy(wordBank, (word) => word.length );
        this.#wordMaxLength = Math.max(...Object.keys(this.#lengthToWords));
        this.#wordMinLength = Math.min(...Object.keys(this.#lengthToWords));
        this.#ready = true;
      });
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
    console.log(password);
    console.log(password.length);
    // console.log(randomWords.reduce((acc, x) => acc + x, 0));

    return password;
  }

  /**
   *
   * @param {int} length
   * @param {seedrandom.PRNG} rng
   * @returns {int[]}
   */
  #generateWordLengths = (length, rng) => {
    let totalLength = 0;
    let wordLengths = [];

    while (true) {
      let nextLength = Math.floor(rng() * (this.#wordMaxLength - this.#wordMinLength) + this.#wordMinLength);
      if (totalLength + nextLength >= length) {
        break;
      }

      wordLengths.push(nextLength);
      totalLength += nextLength + 1; // +1 length for space after word
    }
    return wordLengths;
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