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
Keep the everyday path compact: collapse profile transfer once configured, keep
rotation version visible. Use a
side-by-side generator/result workspace on wider screens. Phone layouts may keep
short related fields paired until the screen is too narrow for comfortable use.

## User model

Each user has:

1. A strong private master secret that is never stored or transmitted.
2. A random public Mimi Profile Code containing a 128-bit salt and checksum.
3. Credential inputs: application/device label, username, rotation slot,
   style, separator, and exact length.

The profile code is stored locally and can be copied/applied on other devices.
It is safe to print or encode in a QR code, but users must retain a recovery copy:
losing every copy changes all V2 passwords. The UI supports transfer by QR
display (scannable with a phone's native camera), `.mimi-profile` file, and
copy/paste. An in-app camera scanner was intentionally dropped to keep the
third-party supply chain minimal — the native camera plus the deep-link QR
already cover it.

Deep-link fragments are handled on initial load, same-document `hashchange`, and
browser-cache restore. A valid linked code opens the Profile panel and confirms
that it is active without requiring a refresh. An invalid linked code must never
erase an existing valid local profile.

For a laptop login, a user opens the installed PWA on a phone—optionally in
airplane mode—selects `Laptop / device login`, enters a stable user-chosen device
label and username, derives a transcription-friendly word password, and types it
into the laptop. Device labels must not be inferred from mutable hostnames or
hardware identifiers.

## Repository architecture

Since 2026-08-29 the repository is a small monorepo: npm tooling
(`package.json`, `package-lock.json`, `webpack.config.cjs`,
`webpack.extension.cjs`, `node_modules`) lives at the root, and the derivation
core plus assets live in `shared/`, imported by both clients.

| Path | Responsibility |
| --- | --- |
| `shared/core/derive-v2.js` | Argon2id V2 input encoding, deterministic byte expansion, and exact-length word/character formatters. |
| `shared/core/legacy.js` | Frozen V1 web-generator compatibility implementation. No longer exposed in the PWA UI (removed pre-adoption, no existing user passwords); retained for the extension options page and future reference. |
| `shared/core/profile.js` | Random 128-bit profile creation, Base32 representation, and checksum validation. |
| `shared/core/profile-link.js` | Extracts Profile Codes from privacy-preserving URL fragments used by QR deep links. |
| `shared/core/qr.js` | Renders the public Profile Code (as an auto-import deep link) to a scannable dark-on-light SVG QR. |
| `shared/core/profile-file.js` | Builds and parses the `.mimi-profile` transfer file, which carries only the public code. |
| `shared/core/generation-settings.js` | Style-specific recommended lengths and descriptive strength guidance. |
| `shared/core/word-bank.js` | Platform-neutral word-bank loader (`loadWordBankFrom(url)`); no DOM/extension coupling. |
| `shared/core/seedrandom.js` | Vendored ARC4 RNG (from seedrandom 3.0.5) for frozen V1 compatibility only; no npm dependency. |
| `shared/assets/word-bank-v1.txt` | Frozen original list; changing it breaks V1 outputs. |
| `shared/assets/word-bank-v2.txt` | V2 list (15,000 entries: original words, pronouns, plus pre-adoption word-like tokens); frozen. |
| `scripts/expand-wordbank.mjs` | Reproducible generator used for the one-time pre-adoption v2 bank expansion. |
| `scripts/make-icons.mjs` | Regenerates the brand-mark PWA/extension PNG icons from the plum "m" mark. |
| `scripts/build-firefox.mjs` | Copies the built `extension/dist` to `extension/dist-firefox` and injects the Gecko manifest settings for Firefox/AMO. |
| `shared/styles/tokens.css` | Canonical design tokens (palette) consumed by the extension. |
| `shared/test/` | Single golden-vector source (`vectors.js`) plus generators, profile, settings, and transfer suites. |
| `web/src/index.js` | PWA UI wiring; imports the shared core and passes word-bank URLs relative to `document.baseURI`. |
| `web/public/` | PWA-only shell: `index.html`, `style.css`, `service-worker.js`, `manifest.webmanifest`, icons. |
| `web/test/build.test.js` | Build-boundary check on the built `web/dist`. |
| `extension/public/manifest.json` | Manifest V3: `storage`+`activeTab` only, `wasm-unsafe-eval` CSP, `Alt+Shift+M` shortcut. |
| `extension/src/platform/chrome.js` | The only browser-specific module: storage, version, word-bank URL, active-tab host. Resolves `browser.*` (Firefox, Promise-based) or `chrome.*` (Chromium) per call, so one bundle runs on both with no polyfill. |
| `extension/src/popup/` | Everyday popup: shared form + generation, active-tab autofill of app/username, per-site presets. |
| `extension/src/options/` | Profile create/import/copy, QR, and `.mimi-profile` transfer, using the shared modules. |
| `extension/test/` | Adapter and manifest (permission/CSP/shortcut) tests. |
| `docs/visual-identity.md` | Shared design language (palette, type, components, voice) for the PWA and extension. |
| `.github/workflows/pages.yml` | Read-only CI build and compatibility gate (runs from the repo root). |
| `.github/workflows/deploy.yml` | Manual-dispatch gh-pages publish; the only `contents: write` workflow. |
| `docs/testing-and-release.md` | Automated-check commands, deploy/rollback steps, and the manual device checklist. |
| `docs/security-review.md` | Internal security review: TCB, controls, hardening applied, and residual risks. |
| `password.py` | Separate original CLI retained for existing users; it is not compatible with web V1/V2. |

There is no application backend, API, Vercel configuration, Python web runtime,
account system, remote analytics, or secret synchronization.

The extension is built with `npm run build:ext` (or `build:all` for both) into
`extension/dist`, loadable unpacked. It ships Argon2 WASM and both word banks
locally, so setup and generation make no network request. It reuses the shared
core byte-for-byte: loading the unpacked popup reproduces the same golden
vectors as the PWA (verified in a Chromium DOM smoke test).

`npm run build:firefox` builds the extension and then writes a Firefox variant
to `extension/dist-firefox` with the Gecko manifest settings added (Chrome warns
on those keys, so the base manifest stays Chrome-clean). The platform adapter is
already cross-browser, so no source changes are needed to target Firefox —
only AMO signing (listed or unlisted) before distribution. Load-unpacked
verification on real Chrome/Edge and real Firefox is still a manual step.

## V2 compatibility contract

`argon2id-v2` is defined by all of the following:

- A 16-byte random profile salt.
- NFKC normalization of the master secret, application, and username.
- Canonical JSON-array context containing protocol name, version, application,
  username, rotation slot, length, style, and separator.
- Context-specific Argon2 salt derived with SHA-256.
- Argon2id: 64 MiB memory, 3 iterations, parallelism 1, 64 output bytes.
- SP 800-108-style counter-mode expansion — `HMAC-SHA256(argon2Key, "mimi-expand-v2" ‖ context ‖ counter)` — and rejection sampling for unbiased selections.
- Exact word-bank ordering, symbol alphabets, format rules, and shuffle order.

`words-v2` produces an exact-length lowercase-word sequence using `-` or `.`,
followed by the separator, an uppercase letter, and a digit. This guarantees
lowercase, uppercase, digit, and commonly accepted special-character coverage.
`characters-v2` guarantees lowercase, uppercase, digit, and a character from
`!@#$%*-_.?`, excludes common visual ambiguities, and produces the exact length.

Never modify a released algorithm, parameter, word-bank order, normalization
rule, encoding, or alphabet. Introduce `v3` instead. Golden vectors in
`shared/test/` are recovery-critical and must not be casually updated to make a
failing change pass.

One-time exception (2026-08-29, pre-adoption): the `word-bank-v2.txt` list was
expanded from 10,014 to 15,000 entries while the service had no users, adding
pronounceable word-like tokens (see `scripts/expand-wordbank.mjs`). The original
10,014 entries are preserved as an exact prefix, but this still changes every
`words-v2` output, so the golden word vectors were regenerated. The bank is
frozen again at 15,000; any further change must use a new algorithm ID.

Two further pre-adoption corrections were made while the service still had no
users (so no passwords are affected): `input.kind` was dropped from the context
array, and the byte-expansion step was moved from a bare
`SHA-256(label ‖ key ‖ context ‖ counter)` hash to an SP 800-108-style
counter-mode KDF, `HMAC-SHA256(argon2Key, label ‖ context ‖ counter)` — a
length-extension-resistant standard PRF, native Web Crypto, no new dependency.
Both regenerated the golden vectors. The construction is now frozen; any later
change must use a new algorithm ID.

Recommended mode is presentation policy, not an additional KDF input. It maps
`words-v2` to 42 characters (five 7-letter words plus the uppercase/digit
suffix, about 65 bits of output-format search space for a fixed separator) and
`characters-v2` to 20 characters. The UI may call 32-character word-style or
16-character compact outputs “Good,” but shorter choices are explicitly below
Mimi's recommendation. Do not
show an apparent-entropy score for one generated sample: the generator's known
distribution and the user's master-secret strength are what matter.

V1 compatibility intentionally preserves the earlier space-joined seed and
weak ARC4-style `seedrandom` construction. It is retained in `shared/core/legacy.js`
for any future tooling or migration needs; new profiles always use V2.

## Setup and verification

Run from the repository root (npm tooling is hoisted there):

```bash
npm ci
npm run build          # PWA → web/dist
npm run build:ext      # extension → extension/dist
npm test               # shared, web, and extension suites
python3 -m http.server 8080 --directory web/dist
```

Required release checks:

- All golden vectors and supported-length properties pass.
- `npm audit` reports no known dependency vulnerabilities.
- `dist/` contains the manifest, service worker, icon, `tokens.css`, stylesheet,
  both word banks, HTML, `.nojekyll`, and bundle.
- The bundle contains no `/api/generate`, Vercel hostname, inline source map,
  third-party request, secret logging, or analytics.
- A clean browser can install the PWA and generate after going offline.
- An upgrade from the previous service-worker cache does not strand old assets.
- GitHub Pages project-path loading works without absolute `/` asset URLs.

## GitHub Pages deployment

Two workflows, split by permission. `pages.yml` runs the build and test suite
read-only on every push to `master`/`main` — it never publishes. `deploy.yml`
is the only workflow with `contents: write` and is **manual-dispatch only**: run
"Deploy Mimi to Pages" from the Actions tab and it builds, tests, and
force-publishes `web/dist` to the `gh-pages` branch. This resolved the earlier
"grant CI write access?" question — automatic pushes stay read-only, while the
one-click deploy removes the manual worktree step. Roll back by running the same
workflow against an earlier tag/commit. Repository Settings → Pages serves the
root of `gh-pages`. See `docs/testing-and-release.md`.

The compact 2026-08-29 release is live at `https://austin-pan.github.io/mimi/`
from `gh-pages` commit `3618f00` as app version `1.1.0`. Its HTML, recommended
and specific length modes, offline-only status, light/dark themes, install guide,
profile-import flow, manifest, service-worker cache version, local Argon2id
generation, responsive layout, and zero-console-error browser smoke test were
verified.

App version `1.2.0` is live at `https://austin-pan.github.io/mimi/`, published by
the `deploy.yml` workflow (gh-pages commit `70db343`, source `d094ac9`). This
build adds style-specific strength guidance, QR-code / `.mimi-profile` / paste
transfer of the public Profile Code, inline SVG theme icons, brand-matched app
icons, a redesigned profile toolbar, the refined 15,000-entry `words-v2` bank,
shared `tokens.css`, an update-available prompt, a minimized dependency surface
(vendored `seedrandom`, no `jsqr`), and a tightened CSP. Its build, 27-test
suite, and a zero-console-error Chromium smoke test were verified. The
service-worker cache is `mimi-pwa-2026-08-29-v10`. `master` is at the same
source and green.

App version `1.2.1` is live at `https://austin-pan.github.io/mimi/`, published by
the `deploy.yml` workflow (gh-pages commit `ae89b49`, source `0321928`). It fixes
QR deep links on already-open pages, visibly confirms the active scanned code,
preserves an existing profile after a malformed link, replaces the ambiguous
“Import” action with explicit “Use this code” state, and reorganizes the mobile
Profile toolbar. Both PWA and extension builds, all 28 tests, the v11 service-
worker cache, mobile layout, same-document valid/invalid QR flows, and the live
GitHub Pages release were verified with zero browser console warnings/errors.

App version `1.3.0` is live at `https://austin-pan.github.io/mimi/`, published by
the `deploy.yml` workflow (gh-pages commit `4084a24`, source `078a470`). It hides “Use this code” until the
field contains a non-active candidate; activates QR links and `.mimi-profile`
files immediately; collapses the Profile panel and shows a toast after successful
activation; adds concise button titles and tap/focus/hover field help; promotes
password type and rotation version to the main form; and makes the footer version
an explicit service-worker update check. The install guide now explains that iOS
Home Screen apps and Safari keep separate profile storage. Both builds, all 28
tests, the v12 cache, profile activation flow, and the 390px mobile layout were
verified locally, and the uncached live HTML was confirmed at v1.3.0.

App version `1.3.1` is live at `https://austin-pan.github.io/mimi/`, published by
the `deploy.yml` workflow (gh-pages commit `a28f16d`, source `23ff33f`). It adopts the Quiet Constellation
brand mark, replaces the green ambient glow with lavender-plum, positions field
help in the viewport so it cannot clip, fixes dark tooltip contrast, adds
passphrase advice to Secret help, gives selects more arrow clearance, and
renames the pending profile action to “Apply code” with an enter-arrow icon. The
v13 service-worker cache makes the update visible to installed clients. Both
builds, all 28 tests, dark/mobile tooltip behavior, and uncached live HTML were
verified.

App version `1.3.2` is live at `https://austin-pan.github.io/mimi/`, published by
the `deploy.yml` workflow (gh-pages commit `1eb57a5`, source `b36981d`). It switches to Traveling Spark,
removes password type from the everyday recipe while preserving it under Older
password settings, clarifies Username and Secret help, adds compact iPhone QR
handoff steps beside the QR, and decorates wide-screen result whitespace. The
native Expo/React Native architecture is specified in
`docs/native-mobile-plan.md`; the v14 cache advertises this update. Both builds,
all 28 tests, wide/QR browser layouts, and uncached live HTML were verified.

App version `1.3.3` deployed (source `c2fd3fb`→`e1295ad`). Removes the V1
compatibility style options (no existing user passwords; V1 code retained in
`shared/core/` for future tooling), removes `input.kind` from the argon2id-v2
context (pre-adoption correction; recomputed golden vectors), reorganises the
recipe row (style spans full width, separator + version share the row below),
softens the "Your secret" tooltip to recommendations rather than requirements,
improves the offline indicator tooltip, tightens the "New profile" de-emphasis
when a profile is active, fixes the iPad `.mimi-profile` file-picker by adding
`application/octet-stream` to the accept list, updates CI to Node 24, and pins
`actions/checkout` and `actions/setup-node` to reviewed v7 commit SHAs. iOS
Safari QR import and offline generation verified on device. All 28 tests pass.

App version `1.3.4` is live at `https://austin-pan.github.io/mimi/`, published by
the `deploy.yml` workflow (gh-pages commit `fbe5bac`, source `65131d0`). It
hardens the `argon2id-v2` byte expansion: replaces the
`SHA-256(label ‖ key ‖ context ‖ counter)` construction with an SP 800-108-style
counter-mode KDF, `HMAC-SHA256(argon2Key, label ‖ context ‖ counter)` — a
length-extension-resistant standard PRF via native Web Crypto, no new dependency
(pre-adoption correction; golden vectors regenerated). It also makes the browser
extension cross-browser: the platform adapter now resolves `browser.*`/`chrome.*`
per call, and `npm run build:firefox` emits a Firefox/AMO package
(`extension/dist-firefox`) with Gecko manifest settings, no
`webextension-polyfill`. Extension manifest bumped to 1.3.4; service-worker cache
advanced to v15. All 29 tests pass; the new expansion was verified in Node
(exact golden vectors, production Argon2 parameters) and end-to-end in a browser
(WASM Argon2id + WebCrypto HMAC, zero console errors), and the live release was
confirmed at v1.3.4 with the v15 cache.

App version `1.3.5` deployed (source `c4fa897`). UI/PWA polish: a tap or click outside an open
field tooltip now dismisses it; generating a password scrolls the result into
view, moves focus to it (`#password-result` is `tabindex="-1"`), and replays a
brief highlight (respecting `prefers-reduced-motion`). Regenerates the PWA/
extension PNG install icons to the corrected Traveling Spark mark — they had
been stale since `b36981d`, before the spark fix — and adds a `?v=2` cache-
busting query to the icon URLs in the manifest and `index.html` so Android/
desktop installs refetch the new icon (the OS caches the install icon by URL;
a same-URL byte change is not reliably picked up). **iOS Home Screen icons never
auto-update — the user must remove and re-add Mimi.** The service worker now
matches with `ignoreSearch` so versioned icon URLs still resolve offline.
Extension manifest bumped to 1.3.5; service-worker cache advanced to v16. All 29
tests pass; tooltip dismissal, the reveal animation/scroll/focus, and the
versioned built manifest were verified in a browser. PNGs were regenerated with
`rsvg-convert` (librsvg) from the same brand SVG as `scripts/make-icons.mjs`.

App version `1.3.6` deployed (source `9fcd6c8`, PWA only). Brings the in-page top-left header
brand mark (`.brand-star` in `style.css`) in line with the app icon: the spark
moves off the tight corner to the icon's inset position and takes the blush tone
(`#e7b4ae`) instead of lavender. CSS-only; service-worker cache advanced to v17.
The extension stays at 1.3.5 (unaffected). Verified in a browser.

App version `1.3.7` deployed (source `19790c2`, PWA only). Stops iOS Safari from auto-zooming
into a form field on focus (and never zooming back out, so the generated
password stayed off-screen): form controls inherited the small label text
(~12px) via `font: inherit`, and iOS zooms any field under 16px. `input, select`
now set an explicit `font-size: 16px`, which suppresses the zoom entirely while
labels keep their smaller size. CSS-only; service-worker cache advanced to v18.
The extension (separate CSS, desktop-only) is unaffected. Verified: all form
controls compute to 16px and the compact mobile layout still holds.

App version `1.3.8` deployed (source `9a8c65e`, PWA only). Re-flows the mobile form so the
larger 16px fields aren't cramped: on phones (≤560px) App/Username and the
recipe fields now stack full width instead of pairing into ~155px columns, and
the "Password version" constraint widened from 8.5rem to 9.5rem so its label no
longer wraps (which had dropped its input out of alignment with the separator).
Desktop keeps the paired two-column layout. CSS-only; service-worker cache
advanced to v19. Verified on mobile (375px) and desktop in a browser.

App version `1.3.9` deployed (source `7e29610`, PWA only). Renames the rotation field from
"Password version" to "Version" and re-pairs Separator + Version onto one row at
every width (the compact field no longer stacks alone with dead space beside
it); the version column narrows to 7rem to suit the shorter label. Help text and
the `slot` field name are unchanged. CSS/label only; service-worker cache
advanced to v20. Verified on mobile and desktop in a browser.

App version `1.3.10` is live at `https://austin-pan.github.io/mimi/`, published by
the `deploy.yml` workflow (gh-pages commit `31408f9`, source `f184180`). Fixes
the footer update-check and the update banner. (1) The manual check said "up to
date" even when an update existed, then the banner contradicted it:
`registration.update()` reports a new worker via `updatefound`/`installing`
before it becomes `waiting`, so checking only `waiting` was premature. It now
also watches `updatefound`/`installing` and shows "A new version is downloading…"
(never "up to date") when one is found. (2) The banner collapsed to ~half width
on mobile — `left: 50%` shrink-to-fit capped its width — so its text wrapped to
several lines; it now centres with auto margins at `width: max-content` (one
line, full-width fallback), with the message shortened to "A new version is
ready." (3) All toasts and the banner play a re-triggerable attention animation
(`toast-attention`/`banner-attention`, pop + settle), honoring
`prefers-reduced-motion`. CSS/JS only; service-worker cache advanced to v21. All
29 tests pass; verified in a browser.

App version `1.3.11` committed (sources `17133f4`, `9765d3e`), deploy superseded
by v1.3.13. PWA-only form polish: (1) form label `font-weight` reduced from 750
(rendered as 800/ExtraBold on system fonts) to 600 (Semibold) — labels and the
length fieldset legend included; (2) select arrow: `appearance: none` + custom
SVG chevron via `background-image`, `padding-right 1.9→2.1rem`,
`background-position right 0.7→0.9rem` — consistent across iOS, Android, and
desktop with a controlled gap from the border; (3) help-tip `?` spans removed
from tab order (no `tabindex="0"`); Tab now flows core recipe fields only.
Additionally, the git remote was switched from SSH to HTTPS and
`gh auth git-credential` set as the local credential helper so future pushes
work without re-generating an SSH agent across sessions. No service-worker or
golden-vector changes. All 29 tests pass.

App version `1.3.12` committed (source `68e3e0a`), deploy superseded by v1.3.13.
PWA-only bug fix and polish: (1) dropdown arrows invisible after v1.3.11 —
CSS minifier decoded `%23` → literal `%23` in the SVG `stroke` attribute making
it an invalid color; fixed by switching to base64-encoded data URI which the
minifier leaves intact; (2) "Compact characters" recipe layout — when separator
row is hidden, the Style field was stranded on its own row; fixed with
`:has(#separator-row[hidden]) .style-field { grid-column: 1 }` so Style and
Version pair on one row; (3) form `autocomplete="off"` to reduce browser
save-password prompts; (4) skip link (`Skip to form`) from keyboard focus to the
first recipe field; (5) `G` key shortcut focuses the application input from
anywhere outside a form control. No service-worker cache bump (oversight — fixed
in v1.3.13). All 29 tests pass.

App version `1.3.13` committed (source `a5c470a`), deploy pending. Fixes two regressions
from v1.3.11/v1.3.12: (1) Update-check always returned "up to date" — root cause
was that `service-worker.js` was not modified in v1.3.11 or v1.3.12, so
`registration.update()` saw an identical SW script and never fired `updatefound`;
fixed by bumping `CACHE_NAME` from `mimi-pwa-2026-08-29-v21` to
`mimi-pwa-2026-08-29-v22` — any change to the SW file forces the browser to
detect and install the new worker. (2) Dropdown arrows still invisible on the live
site — the live site was running v1.3.11 (broken `%23` SVG encoding) because
neither v1.3.11 nor v1.3.12 was deployed; deploying v1.3.13 (which carries the
v1.3.12 base64 arrow fix) resolves this. All 29 tests pass.

The build and compatibility suite gate every deployment. Do not bypass them.
For stronger supply-chain protection, enable branch protection, require review
for workflow/core changes, and protect the GitHub account with passkeys or
two-factor authentication.

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
- Network egress is the primary control: CSP `connect-src 'self'` (no external
  hosts) means even a malicious bundled library cannot exfiltrate the secret.
  The trusted computing base is deliberately small — `hash-wasm` (Argon2,
  essential) and `qrcode-generator` (public code only); `seedrandom` is vendored
  and `jsqr`/the camera scanner were removed. See `docs/security-review.md`.
- `frame-ancestors`/`X-Frame-Options` cannot be set on GitHub Pages (no response
  headers; meta CSP ignores `frame-ancestors`), so the page can be framed. Low
  impact (generate/copy only); a header-setting host would close it.

This project has not received an independent cryptographic review. Do not claim
that it has. `docs/security-review.md` records an internal review only.

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
- [x] Added QR-code and `.mimi-profile` file transfer of the public Profile Code
  (no secret), with the QR encoding the app's own auto-import deep link.
- [x] Replaced the light/dark toggle emoji with inline SVG sun/moon icons.
- [x] Documented the shared visual identity in `docs/visual-identity.md`.
- [x] Extracted the derivation core, word banks, tokens, and golden vectors to a
  repo-root `shared/` and hoisted npm tooling to the root (behavior-preserving).
- [x] Scaffolded the Manifest V3 extension (popup + options) reusing the shared
  core and visual language, with active-tab autofill of app label and username,
  per-site presets, profile QR/file transfer, and an `Alt+Shift+M` shortcut.
  Verified byte-for-byte parity with the PWA in a Chromium DOM smoke test.
- [x] Regenerated the PWA/extension icons to match the plum italic-"m" brand
  mark, and redesigned the profile actions into a grouped, icon-labeled toolbar.
- [x] Expanded the `words-v2` bank to 15,000 word-like entries (pre-adoption,
  authorized) and regenerated the golden word vectors; later refined the
  generator's phonotactics for more name/word-like tokens.
- [x] Folded `shared/styles/tokens.css` into the web build so the PWA and
  extension consume one token file.
- [x] Added a service-worker update flow with an in-app "refresh to update"
  banner; documented rollback in `docs/testing-and-release.md`.
- [x] Added a manual-dispatch `deploy.yml` (the only `contents: write` workflow)
  and a manual device/extension test checklist.
- [x] Minimized the third-party supply chain: vendored `seedrandom`'s ARC4 core
  into `shared/core/seedrandom.js` (V1 vectors byte-identical) and removed QR
  *scanning* (`jsqr`). Remaining runtime deps are `hash-wasm` (Argon2, essential)
  and `qrcode-generator` (QR display of the public code). Transfer is by QR
  display + native phone camera, `.mimi-profile` file, and copy/paste.
- [x] Made QR deep links activate on already-open pages without a refresh,
  protected valid local profiles from malformed links, renamed paste activation
  to “Use this code,” added active/edited button states, and organized the PWA's
  mobile Profile toolbar into two-column action groups.
- [x] Made profile application transactional and quiet: manual code, QR link,
  and file load all activate immediately, collapse the panel, and confirm with a
  toast; the activation button only exists while a changed candidate needs action.
- [x] Added targeted field help, visible rotation-version controls, and a
  tappable footer version that checks the service worker for updates.

### Next

- [x] Performed the `docs/testing-and-release.md` manual checklist on real iOS
  Safari: service worker, install, native-camera QR import, and offline
  generation all verified.
- [x] Pinned `actions/checkout` and `actions/setup-node` to reviewed v7 commit
  SHAs; upgraded CI to Node 24.
- [x] Made the extension cross-browser without `webextension-polyfill` (adapter
  resolves `browser.*`/`chrome.*` per call) and added `npm run build:firefox`
  to emit a Firefox/AMO package with Gecko manifest settings.
- [x] Brought the shared design tokens (`tokens.css`) to the extension options
  page (both surfaces already load the one stylesheet).
- [ ] Extension Phase 4: load-unpacked verification in real Chrome/Edge and real
  Firefox (popup lifecycle, keyboard/AX, zoom, themes, WASM load), then AMO
  signing (listed or unlisted). Consider a PSL-based registrable-domain helper
  to replace the current `www.`-stripping host heuristic.
- [ ] Perform the manual checklist on Android Chrome (service worker, install,
  native-camera QR import, offline).
- [ ] Design a V3 compatibility-policy model for minimum uppercase, digit,
  special, and distinct-special counts without changing released V2 outputs.
- [ ] Commission an independent cryptographic review before recommending Mimi
  for high-value credentials.
- [ ] Consider direct password-field autofill (content script) for the
  extension — explicitly deferred in the plan behind a larger trust boundary.
