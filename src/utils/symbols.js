import seedrandom from "seedrandom";

/**
 * Create an array with the numbers from `start` to `stop`, inclusive.
 *
 * @param {int} start Number to start range at.
 * @param {int} stop Number to end range at.
 * @returns {string[]} Range array.
 */
const getUnicodeRange = (start, stop) => {
  return Array.from(
    { length: (stop - start) + 1 },
    (_value, _index) => String.fromCharCode(start + _index)
  ).join("");
}

const upper = getUnicodeRange(65, 90);
const lower = getUnicodeRange(97, 122);
const letters = upper.concat(lower);
const digits = getUnicodeRange(48, 57);
const space = String.fromCharCode(32);
const special = getUnicodeRange(33, 47) +
  getUnicodeRange(58, 64) +
  getUnicodeRange(91, 96) +
  getUnicodeRange(123, 126);

export {
  upper,
  lower,
  letters,
  space,
  special,
  digits
};
