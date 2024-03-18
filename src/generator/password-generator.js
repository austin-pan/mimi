import * as WordsV1 from "./words-v1.js";
import * as CharactersV1 from "./characters-v1.js";

export function generate(type, seed, length, config) {
  switch (type) {
    case WordsV1.id:
      return WordsV1.generate(seed, length, config);
    case CharactersV1.id:
      return CharactersV1.generate(seed, length, config);
    default:
      throw new Error(`Unrecognized password type ${type}`);
  }
}
