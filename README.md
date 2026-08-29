# Mimi

Mimi ("secret" in Mandarin) is an offline-first, deterministic password
derivation app. Given the same Mimi Profile, master secret, credential details,
algorithm version, and length, it produces the same password without storing or
transmitting the secret or password.

## Web PWA

The primary application is a static Progressive Web App in `web/`. It can be
hosted on GitHub Pages and installed on a phone or computer for offline use.

```bash
npm ci
npm run build
npm test
python3 -m http.server 8080 --directory web/dist
```

Open `http://127.0.0.1:8080`. Service workers require HTTP(S); do not open the
HTML through a `file://` URL. Run these from the repository root; npm tooling and
the shared derivation core live at the root (`shared/`), with the PWA in `web/`
and the Manifest V3 extension in `extension/` (`npm run build:ext`).

The first-time flow creates a public, random Mimi Profile Code. Back it up and
apply it on each device. It contains no master secret, but losing every copy
changes all `argon2id-v2` outputs.

To reuse a code, paste it into the Profile Code field and choose **Apply
code**; Mimi does not read the clipboard automatically. A link or external QR
code using `#profile=…` applies the profile locally and removes the fragment from
the visible URL after validation. Loading a `.mimi-profile` file also activates
it immediately. On iPhone and iPad, Safari and an installed Home Screen app keep
separate profile storage, so apply the profile once inside each surface.

The app supports:

- `words-v2`: exact-length words separated by `-` or `.`, ending in a random
  uppercase letter and digit. The separator supplies a commonly accepted
  special character.
- `characters-v2`: exact-length characters with guaranteed uppercase,
  lowercase, digit, and common-special coverage.
- Frozen `words-v1` and `characters-v1` compatibility modes for passwords made
  by the earlier web generator.
- Style-specific recommended lengths (42 for Friendly words and 20 for Compact
  characters), optional exact lengths from 12 through 64, and per-credential
  rotation slots.
- Plain-language strength guidance based on the selected generator and length,
  plus confirmation of the character classes V2 guarantees. Mimi deliberately
  does not score the apparent randomness of an individual output.
- Public Profile Code transfer by QR code, `.mimi-profile` file, and copy/paste.
  The QR encodes an auto-import deep link, so scanning it with a phone's built-in
  camera opens Mimi and applies the profile — no in-app scanner needed. Android
  may route the scoped link into an installed PWA. iOS opens it in Safari, whose
  profile storage is separate; copy the active code there and apply it once in
  installed Mimi. Nothing transferred carries a secret.
- An in-app "new version is ready" prompt when an updated service worker is
  waiting, so updates apply on an explicit refresh rather than silently. Tap the
  version number in the footer to check manually.

See [the visual identity guide](docs/visual-identity.md) for the shared design
language, and [the browser extension implementation plan](docs/browser-extension-plan.md)
for the Manifest V3 companion and shared-core architecture.

## GitHub Pages

`.github/workflows/pages.yml` runs a read-only build and compatibility gate on
pushes. Publishing is human-triggered through the **Deploy Mimi to Pages**
workflow (`deploy.yml`), which rebuilds, tests, and then replaces the `gh-pages`
branch. It is the only workflow with `contents: write`; ordinary push CI remains
read-only. See [the testing and release guide](docs/testing-and-release.md).

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
- The dependency surface is deliberately small — Argon2 (`hash-wasm`) and a
  QR encoder for the public code (`qrcode-generator`); a strict Content Security
  Policy blocks all external network access. See
  [the security review](docs/security-review.md).

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
