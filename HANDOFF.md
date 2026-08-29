# Mimi project handoff

> **Living handoff contract:** update this file whenever architecture, setup,
> compatibility rules, deployment, security assumptions, or priorities change.

## Product decision

Mimi is now a backend-free, offline-first password derivation PWA. The previous
FastAPI/Vercel generator was removed because it received master secrets and
created a remote guessing oracle, logging exposure, abuse/cost surface, and
online availability dependency.

GitHub Pages serves static files only. All sensitive computation occurs locally.
After a trusted release is installed, generation works without a network.

The interface should feel like a calm utility rather than a security dashboard.
Keep the everyday path compact: collapse profile transfer once configured, place
secondary compatibility/rotation settings under “More options,” and use a
side-by-side generator/result workspace on wider screens. Phone layouts may keep
short related fields paired until the screen is too narrow for comfortable use.

## User model

Each user has:

1. A strong private master secret that is never stored or transmitted.
2. A random public Mimi Profile Code containing a 128-bit salt and checksum.
3. Credential inputs: kind, application/device label, username, rotation slot,
   style, separator, and exact length.

The profile code is stored locally and can be copied/imported on other devices.
It is safe to print or encode in a QR code, but users must retain a recovery copy:
losing every copy changes all V2 passwords. The current UI supports code transfer;
QR display/scanning and file export remain future convenience work.

For a laptop login, a user opens the installed PWA on a phone—optionally in
airplane mode—selects `Laptop / device login`, enters a stable user-chosen device
label and username, derives a transcription-friendly word password, and types it
into the laptop. Device labels must not be inferred from mutable hostnames or
hardware identifiers.

## Repository architecture

| Path | Responsibility |
| --- | --- |
| `web/src/core/derive-v2.js` | Argon2id V2 input encoding, deterministic byte expansion, and exact-length word/character formatters. |
| `web/src/core/legacy.js` | Frozen V1 web-generator compatibility implementation. |
| `web/src/core/profile.js` | Random 128-bit profile creation, Base32 representation, and checksum validation. |
| `web/src/core/generation-settings.js` | Style-specific recommended lengths and descriptive strength guidance shared by future clients. |
| `web/public/word-bank-v1.txt` | Frozen original list; changing it breaks V1 outputs. |
| `web/public/word-bank-v2.txt` | V2 list, including added pronouns; immutable after release. |
| `web/public/service-worker.js` | Same-origin offline shell caching. Bump its cache name for cache-layout changes. |
| `web/public/manifest.webmanifest` | Relative-scope PWA manifest compatible with GitHub project Pages and custom domains. |
| `web/test/` | Golden vectors, property/boundary tests, profile tests, and build-boundary checks. |
| `.github/workflows/pages.yml` | Read-only CI build and compatibility gate. |
| `password.py` | Separate original CLI retained for existing users; it is not compatible with web V1/V2. |

There is no application backend, API, Vercel configuration, Python web runtime,
account system, remote analytics, or secret synchronization.

## V2 compatibility contract

`argon2id-v2` is defined by all of the following:

- A 16-byte random profile salt.
- NFKC normalization of the master secret, application, and username.
- Canonical JSON-array context containing protocol name, version, credential
  kind, application, username, rotation slot, length, style, and separator.
- Context-specific Argon2 salt derived with SHA-256.
- Argon2id: 64 MiB memory, 3 iterations, parallelism 1, 64 output bytes.
- SHA-256 counter expansion and rejection sampling for unbiased selections.
- Exact word-bank ordering, symbol alphabets, format rules, and shuffle order.

`words-v2` produces an exact-length lowercase-word sequence using `-` or `.`,
followed by the separator, an uppercase letter, and a digit. This guarantees
lowercase, uppercase, digit, and commonly accepted special-character coverage.
`characters-v2` guarantees lowercase, uppercase, digit, and a character from
`!@#$%*-_.?`, excludes common visual ambiguities, and produces the exact length.

Never modify a released algorithm, parameter, word-bank order, normalization
rule, encoding, or alphabet. Introduce `v3` instead. Golden vectors in
`web/test/generators.test.js` are recovery-critical and must not be casually
updated to make a failing change pass.

Recommended mode is presentation policy, not an additional KDF input. It maps
`words-v2` to 42 characters (five 7-letter words plus the uppercase/digit
suffix, about 65 bits of output-format search space for a fixed separator) and
`characters-v2` to 20 characters. The UI may call 32-character word-style or
16-character compact outputs “Good,” but shorter choices are explicitly below
Mimi's recommendation. Do not
show an apparent-entropy score for one generated sample: the generator's known
distribution and the user's master-secret strength are what matter.

V1 compatibility intentionally preserves the earlier space-joined seed and
weak ARC4-style `seedrandom` construction. It is exposed only so existing users
can reproduce passwords; new profiles default to V2.

## Setup and verification

```bash
cd web
npm ci
npm run build
npm test
python3 -m http.server 8080 --directory dist
```

Required release checks:

- All golden vectors and supported-length properties pass.
- `npm audit` reports no known dependency vulnerabilities.
- `dist/` contains the manifest, service worker, icon, stylesheet, both word
  banks, HTML, `.nojekyll`, and bundle.
- The bundle contains no `/api/generate`, Vercel hostname, inline source map,
  third-party request, secret logging, or analytics.
- A clean browser can install the PWA and generate after going offline.
- An upgrade from the previous service-worker cache does not strand old assets.
- GitHub Pages project-path loading works without absolute `/` asset URLs.

## GitHub Pages deployment

The workflow triggers on pushes to `main` or `master` and on manual dispatch.
Repository Settings → Pages uses the root of the `gh-pages` branch. CI uses the
official checkout and Node actions with read-only repository permission. The
current release is published manually from the tested `web/dist` artifact.
Automatic branch publishing is intentionally deferred because it requires a
persistent `contents: write` workflow permission.

The compact 2026-08-29 release is live at `https://austin-pan.github.io/mimi/`
from `gh-pages` commit `3618f00` as app version `1.1.0`. Its HTML, recommended
and specific length modes, offline-only status, light/dark themes, install guide,
profile-import flow, manifest, service-worker cache version, local Argon2id
generation, responsive layout, and zero-console-error browser smoke test were
verified.

App version `1.2.0` (style-specific strength guidance) is built and tested on
`master` but has not yet been pushed to `gh-pages`. Deploy it by building
`web/dist` and replacing the `gh-pages` branch root after CI passes.

The build and compatibility suite gate every deployment. Do not bypass them.
For stronger supply-chain protection, pin each action to a reviewed commit SHA,
enable branch protection, require review for workflow/core changes, and protect
the GitHub account with passkeys or two-factor authentication.

## Security boundaries

- Algorithms and word banks are public and are not security controls.
- A strong, randomly constructed master secret plus Argon2id resists guessing.
- A known generated password still lets an attacker verify master-secret guesses
  offline; Argon2id raises cost but cannot protect a weak secret.
- Profile codes are public salts, not authentication credentials.
- Browser memory cannot be reliably zeroized.
- A compromised deployment/update can steal future inputs. Keep the app
  dependency-minimal, same-origin, auditable, reproducibly built, and usable
  offline. A signed extension/native app is a future stronger delivery channel.
- Clipboard use is opt-in and cannot guarantee automatic safe restoration.
- A manually typed laptop password can be observed by the target device or a
  nearby attacker; Mimi only controls derivation and display.

This project has not received an independent cryptographic review. Do not claim
that it has.

## Current work

### Completed 2026-08-29

- [x] Removed backend/Vercel secret processing and related dependencies.
- [x] Added anonymous portable profile codes with checksums.
- [x] Added local Argon2id V2 word and character generation.
- [x] Added exact 12–64 character selection, rotation slots, device-login mode,
  `-`/`.` word separators, common symbols, digits, and pronouns.
- [x] Preserved V1 algorithms and word bank with golden vectors.
- [x] Added offline PWA shell and GitHub Pages deployment workflow.
- [x] Published and smoke-tested the first backend-free GitHub Pages release.
- [x] Reworked the PWA into a warmer, compact design with collapsible profile and
  advanced controls, a two-column desktop workspace, and reduced mobile height.
- [x] Added a contextual install control with native Chromium prompting and a
  platform-aware fallback guide; clarified profile importing with inline status.
- [x] Added a pleasant dark theme that follows the initial system preference and
  remembers an explicit light/dark choice locally.
- [x] Added visible app release versioning, made connectivity status offline-only,
  and changed password length to recommended-by-default with an explicit custom
  12–64 character option.
- [x] Added style-specific defaults (42 Friendly words, 20 Compact characters),
  concise design-based strength guidance, and golden outputs for both defaults.
- [x] Added a detailed Manifest V3 browser extension plan that mirrors PWA
  functionality and extracts one shared derivation/settings core.

### Next

- [ ] Deploy `1.2.0` to `gh-pages` (style-specific strength guidance is built
  and tested on `master` but not yet live).
- [ ] Decide whether to grant CI `contents: write` for automatic `gh-pages`
  publishing or keep the safer manual release step.
- [ ] Perform clean-install and offline browser testing on iOS Safari and Android
  Chrome; service-worker behavior cannot be fully proven by Node unit tests.
- [ ] Add QR display/scanning and `.mimi-profile` import/export without adding
  network dependencies or encoding the master secret.
- [ ] Add an explicit update-available screen and document rollback.
- [ ] Design a V3 compatibility-policy model for minimum uppercase, digit,
  special, and distinct-special counts without changing released V2 outputs.
- [ ] Commission an independent cryptographic review before recommending Mimi
  for high-value credentials.
- [ ] Build the Manifest V3 extension on branch
  `claude/browser-extension-plan-iy0cq6`, following
  `docs/browser-extension-plan.md` and preserving all shared golden vectors.
  Phase 1 (shared core extraction) is the gating step before any popup work.
