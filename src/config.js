import { letters, upper, digits, special } from "./utils/symbols.js";

export class PasswordConfig {
  constructor(options) {
    this.options = options;
  }

  /**
   *
   * @param {string} password
   * @returns {boolean}
   */
  validate = (password) => {
    let hasUpper = false
    let hasDigit = false
    let hasPunc = false
    let numLetters = 0
    for (const c of password) {
        if (letters.includes(c)) { numLetters += 1; }
        if (upper.includes(c)) { hasUpper = true; }
        if (digits.includes(c)) { hasDigit = true; }
        if (special.includes(c)) { hasPunc = true; }
    }

    return hasUpper && hasDigit && hasPunc;
  }
}