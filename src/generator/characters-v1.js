import seedrandom from "seedrandom";
import { letters, digits, special, space } from "../utils/symbols.js";

const alphabet = letters.concat(digits, special, space);

export const id = "characters-v1";

/**
 * Generate a password of the specified length.
 *
 * @param {string} seed Seed for random number generator.
 * @param {int} length Length of password.
 * @returns {string} Generated password.
 */
export function generate(seed, length, config) {
  const rng = seedrandom(seed);

  for (let i = 0; i < 10; i++) {
    const password = generatePotentialPassword(rng, length);
    if (config.validate(password)) {
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
const generatePotentialPassword = (rng, length) => {
  return Array.from(
    { length },
    (_value, _index) => alphabet[Math.floor(rng() * alphabet.length)]
  ).join("");
}