import seedrandom from "seedrandom";
import { letters, digits, special, space } from "./symbols.js";
import PasswordConfig from "./config";

export default class PasswordGenerator {
  /**
   *
   * @param {PasswordConfig} config
   */
  constructor(config) {
    this.config = config;
    this.alphabet = letters.concat(digits, special, space);
  }

  /**
   * Generate a password of the specified length.
   *
   * @param {string} seed Seed for random number generator.
   * @param {int} length Length of password.
   * @returns {string} Generated password.
   */
  generate = (seed, length) => {
    const rng = seedrandom(seed);

    for (let i = 0; i < 10; i++) {
      const password = this.#generatePotentialPassword(rng, length);
      console.log(this.alphabet.length);
      console.log(password);
      if (this.config.validate(password)) {
        return password;
      }
    }
    throw new Error("Too many generation attempts, please check alphabet and validator");
  }

  /**
   *
   * @param {seedrandom.PRNG} rng
   * @param {int} length
   * @returns {string}
   */
  #generatePotentialPassword = (rng, length) => {
    return Array.from(
      { length },
      (_value, _index) => this.alphabet[Math.floor(rng() * this.alphabet.length)]
    ).join("");
  }
}
