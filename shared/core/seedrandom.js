// Vendored from seedrandom 3.0.5 (David Bau) — the original ARC4 generator only,
// reduced to the deterministic seeded path Mimi's frozen V1 compatibility needs.
// Autoseeding, the entropy pool, global/Math injection, and state export are
// removed because Mimi never uses them; the seeded output stream is byte-for-byte
// identical to the upstream library (verified by the V1 golden vectors).
//
// Kept in-tree instead of as an npm dependency to shrink the audited supply chain.
//
// Original license (MIT):
// Copyright 2019 David Bau. Permission is hereby granted, free of charge, to any
// person obtaining a copy of this software and associated documentation files
// (the "Software"), to deal in the Software without restriction... THE SOFTWARE IS
// PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. Full text:
// https://github.com/davidbau/seedrandom/blob/released/LICENSE

const width = 256; // each RC4 output is 0 <= x < 256
const chunks = 6; // at least six RC4 outputs for each double
const digits = 52; // there are 52 significant digits in a double
const startdenom = Math.pow(width, chunks);
const significance = Math.pow(2, digits);
const overflow = significance * 2;
const mask = width - 1;

// An ARC4 implementation. The constructor takes a key as an array of integers
// 0 <= x < width; g(count) returns the next `count` outputs as one number.
function ARC4(key) {
  let t;
  let keylen = key.length;
  const me = this;
  let i = 0;
  let j = me.i = me.j = 0;
  const s = me.S = [];

  if (!keylen) { key = [0]; keylen = 1; }

  while (i < width) { s[i] = i; i += 1; }
  for (i = 0; i < width; i += 1) {
    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
    s[j] = t;
  }

  (me.g = function (count) {
    let r = 0;
    let localI = me.i;
    let localJ = me.j;
    const localS = me.S;
    let localT;
    while (count) {
      localT = localS[localI = mask & (localI + 1)];
      r = r * width
        + localS[mask & ((localS[localI] = localS[localJ = mask & (localJ + localT)]) + (localS[localJ] = localT))];
      count -= 1;
    }
    me.i = localI;
    me.j = localJ;
    return r;
    // RC4-drop[256]: discard an initial batch of outputs for robustness.
  })(width);
}

// Converts an object tree to nested arrays of strings; a plain string returns
// itself. Mimi's V1 seed is always a string.
function flatten(obj, depth) {
  const result = [];
  const typ = typeof obj;
  if (depth && typ === "object") {
    for (const prop in obj) {
      try { result.push(flatten(obj[prop], depth - 1)); } catch { /* ignore */ }
    }
  }
  return result.length ? result : typ === "string" ? obj : `${obj}\0`;
}

// Mixes a string seed into an integer-array key.
function mixkey(seed, key) {
  const stringseed = `${seed}`;
  let smear = 0;
  let j = 0;
  while (j < stringseed.length) {
    key[mask & j] = mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j));
    j += 1;
  }
  return key;
}

export default function seedrandom(seed) {
  const key = [];
  mixkey(flatten(seed, 3), key);
  const arc4 = new ARC4(key);

  // Returns a random double in [0, 1) with randomness in every mantissa bit.
  return function () {
    let n = arc4.g(chunks);
    let d = startdenom;
    let x = 0;
    while (n < significance) {
      n = (n + x) * width;
      d *= width;
      x = arc4.g(1);
    }
    while (n >= overflow) {
      n /= 2;
      d /= 2;
      x >>>= 1;
    }
    return (n + x) / d;
  };
}
