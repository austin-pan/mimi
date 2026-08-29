# Mimi

Mimi ("secret" in Mandarin) is an offline-first, deterministic password
derivation app. Given the same Mimi Profile, master secret, credential details,
algorithm version, and length, it produces the same password without storing or
transmitting the secret or password.

## Web PWA

The primary application is a static Progressive Web App in `web/`. It can be
hosted on GitHub Pages and installed on a phone or computer for offline use.

```bash
cd web
npm ci
npm run build
npm test
python3 -m http.server 8080 --directory dist
```

Open `http://127.0.0.1:8080`. Service workers require HTTP(S); do not open the
HTML through a `file://` URL.

The first-time flow creates a public, random Mimi Profile Code. Back it up and
import it on each device. It contains no master secret, but losing every copy
changes all `argon2id-v2` outputs.

The app supports:

- `words-v2`: exact-length words separated by `-` or `.`, ending in a random
  uppercase letter and digit. The separator supplies a commonly accepted
  special character.
- `characters-v2`: exact-length characters with guaranteed uppercase,
  lowercase, digit, and common-special coverage.
- Frozen `words-v1` and `characters-v1` compatibility modes for passwords made
  by the earlier web generator.
- Lengths from 12 through 64 characters and per-credential rotation slots.

## GitHub Pages

`.github/workflows/pages.yml` runs a read-only build and compatibility gate on
pushes. The current site is published from the root of the existing `gh-pages`
branch. Build `web/dist`, replace that branch's contents, and push it only after
the checks pass. Automatic branch publishing would require granting the workflow
`contents: write`; that permission is intentionally not enabled yet.

The PWA uses only relative URLs, so it works both at a project path such as
`https://austin-pan.github.io/mimi/` and at a custom-domain root.

## Security model

- The master secret and generated password remain in the local browser runtime.
- Only the public profile code is stored in browser storage.
- V2 uses Argon2id with 64 MiB memory, three iterations, and one lane before
  deterministic password formatting.
- The word banks and algorithms are public by design.
- Checked-in golden vectors fail tests if a released algorithm changes.
- The installed PWA works offline after its initial successful load.

This project has not received an independent cryptographic audit. A compromised
site deployment or application update could serve code that captures future
inputs, and a destination site can read a password entered into it. Use a strong,
random master secret and enable passkeys or MFA when available.

## Legacy CLI

`password.py` is retained for users of the original command-line generator. It
uses a separate legacy construction and does not match the PWA algorithms.

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python password.py john.smith@gmail.com gmail
```
