# Mimi web PWA

Static, offline-capable password derivation with no application backend.

## Development

```bash
npm ci
npm run build
npm test
python3 -m http.server 8080 --directory dist
```

Open `http://127.0.0.1:8080`. `npm run watch` rebuilds during development.

`public/` contains the app shell, PWA manifest, service worker, icon, and
versioned word banks. Webpack bundles `src/index.js` and the local derivation
core, then copies `public/` into `dist/`.

## Compatibility contract

Released algorithm IDs are immutable. `test/generators.test.js` contains golden
outputs for the V1 compatibility algorithms and Argon2id V2. Any intentional
algorithm change must use a new ID and add new vectors rather than updating old
expected outputs.

`word-bank-v1.txt` is frozen. `word-bank-v2.txt` adds pronouns and is part of
the `words-v2` output contract. Reordering, adding, or deleting its entries is a
breaking change.

## Length and strength guidance

Recommended mode is style-specific: `words-v2` uses 42 characters and
`characters-v2` uses 20. The 42-character word layout contains five uniformly
selected 7-letter words, an uppercase letter, and a digit; with a fixed
separator, its output-format search space is about 65 bits. The 20-character
alphabet has a much larger theoretical format space, although the required
character classes mean its distribution is not a simple uniform `67^20`.

These figures describe output formats, not a user's actual resistance to
master-secret guessing. The UI therefore uses descriptive guidance rather than
an entropy score for an individual password. The private master secret remains
the practical security ceiling for a deterministic generator.

## Offline behavior

All generation dependencies, including Argon2id WebAssembly and both word
banks, are packaged on the same origin. The service worker caches the complete
shell. When changing cached filenames or behavior, bump `CACHE_NAME` in
`public/service-worker.js` and test a clean install plus an upgrade from the
previous release.
