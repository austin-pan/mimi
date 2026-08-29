# Mimi web PWA

Static, offline-capable password derivation with no application backend.

## Development

Run npm from the repository root (tooling is hoisted there):

```bash
npm ci
npm run build          # → web/dist
npm test
python3 -m http.server 8080 --directory web/dist
```

Open `http://127.0.0.1:8080`. `npm run watch` rebuilds during development.

`web/public/` contains the app shell, PWA manifest, service worker, and icon.
The derivation core and word banks live in the repo-root `shared/`. Webpack
bundles `web/src/index.js` with the shared core, then copies `web/public/` and
`shared/assets/` into `web/dist/`.

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

## Profile links

Mimi accepts a Profile Code in a URL fragment such as
`#profile=MIMI1-…`. Fragments are not sent to GitHub Pages. The app processes the
fragment on initial load, same-document `hashchange`, and browser-cache restore,
then validates and stores the canonical code locally and removes the fragment.
An invalid linked code must never erase a valid locally stored profile.
