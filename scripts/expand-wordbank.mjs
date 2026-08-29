// Deterministically expand word-bank-v2 to TARGET entries by appending
// pronounceable, name/word-like tokens (invented but readable, in the spirit of
// names, places, and romanized borrowings). The first BASE_SIZE entries — the
// original released list plus pronouns — are the frozen base and are preserved
// in order; only new unique lowercase [a-z] tokens are appended after them.
//
// This is a ONE-TIME, pre-adoption change to the words-v2 output contract,
// explicitly authorized while no one uses the service. After this ships, the
// bank is frozen again and any future change must use a new algorithm ID.
//
// Reproducible and idempotent: it always rebuilds the tail from the frozen base,
// so re-running `node scripts/expand-wordbank.mjs` reproduces the same 15,000.

import { readFile, writeFile } from "node:fs/promises";
import seedrandom from "seedrandom";

const TARGET = 15000;
const BASE_SIZE = 10014; // original released list + pronouns; never changes
const BANK = new URL("../shared/assets/word-bank-v2.txt", import.meta.url);
const rng = seedrandom("mimi-word-bank-v2-expansion-2026-refined");

// Weighted picks keep single vowels and single consonants common, so tokens
// stay pronounceable and name-like rather than vowel-soup.
const weighted = (pairs) => pairs.flatMap(([value, weight]) => Array(weight).fill(value));

const ONSETS = weighted([
  ["", 8], ["b", 5], ["c", 4], ["d", 5], ["f", 4], ["g", 4], ["h", 4], ["j", 2],
  ["k", 4], ["l", 5], ["m", 6], ["n", 5], ["p", 5], ["r", 6], ["s", 6], ["t", 6],
  ["v", 3], ["w", 3], ["z", 2], ["br", 2], ["bl", 1], ["cr", 2], ["cl", 1],
  ["dr", 2], ["fr", 2], ["fl", 1], ["gr", 2], ["gl", 1], ["pr", 2], ["pl", 1],
  ["tr", 2], ["st", 2], ["sp", 1], ["sk", 1], ["sh", 2], ["ch", 2], ["th", 2],
]);
const MEDIALS = weighted([
  ["b", 4], ["c", 3], ["d", 5], ["g", 3], ["k", 3], ["l", 6], ["m", 5], ["n", 6],
  ["r", 7], ["s", 5], ["t", 6], ["v", 3], ["z", 2], ["ll", 2], ["nn", 2],
  ["rr", 2], ["ss", 2], ["nd", 3], ["nt", 2], ["st", 2], ["ng", 2], ["rn", 2],
  ["rd", 2], ["ld", 2], ["th", 2], ["sh", 1], ["ch", 1], ["nc", 1], ["mb", 1],
]);
const SINGLE_VOWELS = weighted([["a", 5], ["e", 5], ["i", 4], ["o", 4], ["u", 3]]);
const DIGRAPH_VOWELS = ["ai", "ee", "oo", "ou", "ea", "ei", "ia", "io", "ae"];
const CODAS = weighted([
  ["", 6], ["n", 5], ["r", 4], ["l", 3], ["s", 3], ["t", 3], ["th", 2], ["nd", 2],
  ["nt", 2], ["st", 2], ["rn", 1], ["rd", 1], ["ll", 1], ["m", 2], ["k", 1],
  ["ng", 1], ["sh", 1], ["x", 1], ["ce", 1], ["us", 1], ["on", 1], ["ia", 1],
]);

const BLOCK = [
  "fuck", "shit", "cunt", "nigg", "fag", "slut", "rape", "cock", "dick",
  "tits", "wank", "jizz", "spic", "kike", "chink", "whore", "penis", "vagin",
  "anal", "porn", "arse", "bitch", "damn", "hell", "sex", "nazi", "coon",
  "retard", "pube", "scrotum", "kkk",
];

const pick = (list) => list[Math.floor(rng() * list.length)];
const vowel = () => (rng() < 0.82 ? pick(SINGLE_VOWELS) : pick(DIGRAPH_VOWELS));

function makeWord() {
  const syllables = rng() < 0.55 ? 2 : 3;
  let word = pick(ONSETS) + vowel();
  for (let i = 1; i < syllables; i += 1) word += pick(MEDIALS) + vowel();
  word += pick(CODAS);
  return word.toLowerCase();
}

function acceptable(word, seen) {
  if (word.length < 4 || word.length > 10) return false;
  if (!/^[a-z]+$/.test(word)) return false;
  if (/(.)\1\1/.test(word)) return false;                       // no triples
  if (/[bcdfghjklmnpqrstvwxz]{4,}/.test(word)) return false;    // no 4+ consonants
  if (/[aeiou]{4,}/.test(word)) return false;                   // no 4+ vowels
  if (BLOCK.some((bad) => word.includes(bad))) return false;
  return !seen.has(word);
}

const existing = (await readFile(BANK, "utf8")).split(/\r?\n/).filter(Boolean);
if (existing.length < BASE_SIZE) throw new Error(`base is smaller than ${BASE_SIZE}`);
const base = existing.slice(0, BASE_SIZE);
const seen = new Set(base.map((w) => w.trim().toLowerCase()));
const added = [];

let guard = 0;
while (base.length + added.length < TARGET) {
  if (guard++ > TARGET * 3000) throw new Error("generation stalled");
  const word = makeWord();
  if (acceptable(word, seen)) {
    seen.add(word);
    added.push(word);
  }
}

const all = [...base, ...added];
await writeFile(BANK, all.join("\n") + "\n");
console.log(`base ${base.length}, added ${added.length}, total ${all.length}`);
