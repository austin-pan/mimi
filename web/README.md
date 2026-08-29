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

## Offline behavior

All generation dependencies, including Argon2id WebAssembly and both word
banks, are packaged on the same origin. The service worker caches the complete
shell. When changing cached filenames or behavior, bump `CACHE_NAME` in
`public/service-worker.js` and test a clean install plus an upgrade from the
previous release.
