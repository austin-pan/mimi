import { letters, upper, digits, special } from "./utils/symbols.js";

export class Config {
  /**
   *
   * @param {Option[]} options
   */
  constructor(options) {
    this.options = options;
  }

  validate = (password) => {
    return this.options.every((option) => option.validator(password));
  }
}

class Option {
  /**
   *
   * @param {string} name
   * @param {(password: string) => boolean} validator
   * @param {*} args
   */
  constructor(name, validator, ...args) {
    this.name = name;
    this.validator = validator;
    this.args = args;
  }
}

export const hasUpper = new Option(
  "hasUpper",
  (password) => {
    for (const c of password) {
      if (upper.includes(c)) {
        return true;
      }
    }
    return false;
  }
);

export const hasDigit = new Option(
  "hasDigit",
  (password) => {
    for (const c of password) {
      if (digits.includes(c)) {
        return true;
      }
    }
    return false;
  }
);

export const hasSpecialCharacter = new Option(
  "hasPunct",
  (password) => {
    for (const c of password) {
      if (special.includes(c)) {
        return true;
      }
    }
    return false;
  }
)
