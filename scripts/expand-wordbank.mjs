// Deterministically expand word-bank-v2 to TARGET entries by appending
// pronounceable, word-like tokens (invented but readable, in the spirit of
// names / places / romanized borrowings). Existing entries are preserved in
// order as a prefix; only new unique lowercase [a-z] tokens are appended.
//
// This is a ONE-TIME, pre-adoption change to the words-v2 output contract,
// explicitly authorized while no one uses the service. After this ships, the
// bank is frozen again and any future change must use a new algorithm ID.
//
// Reproducible: run `node scripts/expand-wordbank.mjs` to regenerate identically.

import { readFile, writeFile } from "node:fs/promises";
import seedrandom from "seedrandom";

const TARGET = 15000;
const BANK = new URL("../shared/assets/word-bank-v2.txt", import.meta.url);
const rng = seedrandom("mimi-word-bank-v2-expansion-2026");

const ONSETS = [
  "", "b", "bl", "br", "c", "ch", "cl", "cr", "d", "dr", "f", "fl", "fr",
  "g", "gl", "gr", "h", "j", "k", "kr", "l", "m", "n", "p", "ph", "pl", "pr",
  "qu", "r", "s", "sh", "sk", "sl", "sn", "sp", "st", "str", "sv", "sw", "t",
  "th", "tr", "v", "vr", "w", "y", "z",
];
const MEDIALS = [
  "b", "c", "d", "f", "g", "j", "k", "l", "ll", "m", "n", "nd", "ng", "p",
  "r", "rr", "s", "sh", "ss", "st", "t", "th", "v", "z", "nn", "mm", "rn", "rd",
];
const NUCLEI = [
  "a", "e", "i", "o", "u", "ai", "au", "ea", "ee", "ei", "ia", "io", "oa",
  "oo", "ou", "ua", "ae", "eo", "ya", "yo",
];
const CODAS = [
  "", "", "", "n", "r", "l", "s", "th", "sh", "nd", "ng", "nt", "st", "rn",
  "rd", "ll", "m", "k", "x", "ne", "ra", "ta", "na", "el", "on", "an", "ir",
];

const BLOCK = [
  "fuck", "shit", "cunt", "nigg", "fag", "slut", "rape", "cock", "dick",
  "tits", "wank", "jizz", "spic", "kike", "chink", "whore", "penis", "vagin",
  "anal", "porn", "arse", "bitch", "damn", "hell", "sex", "nazi", "coon",
  "retard", "pube", "scrotum",
];

function pick(list) {
  return list[Math.floor(rng() * list.length)];
}

function makeWord() {
  const syllables = rng() < 0.5 ? 2 : 3;
  let word = pick(ONSETS) + pick(NUCLEI);
  for (let i = 1; i < syllables; i += 1) word += pick(MEDIALS) + pick(NUCLEI);
  word += pick(CODAS);
  return word.toLowerCase();
}

function acceptable(word, seen) {
  if (word.length < 4 || word.length > 11) return false;
  if (!/^[a-z]+$/.test(word)) return false;
  if (/(.)\1\1/.test(word)) return false;            // no triple letters
  if (BLOCK.some((bad) => word.includes(bad))) return false;
  return !seen.has(word);
}

const existing = (await readFile(BANK, "utf8")).split(/\r?\n/).filter(Boolean);
const seen = new Set(existing.map((w) => w.trim().toLowerCase()));
const added = [];

let guard = 0;
while (existing.length + added.length < TARGET) {
  if (guard++ > TARGET * 2000) throw new Error("generation stalled");
  const word = makeWord();
  if (acceptable(word, seen)) {
    seen.add(word);
    added.push(word);
  }
}

const all = [...existing, ...added];
await writeFile(BANK, all.join("\n") + "\n");
console.log(`existing ${existing.length}, added ${added.length}, total ${all.length}`);
