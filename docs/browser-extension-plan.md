# Mimi browser extension implementation plan

## Outcome

Build a Manifest V3 extension that feels like the Mimi PWA in a browser-sized
surface, remains fully local and offline, and imports the same shared generator
modules and assets. Given identical inputs, the PWA and extension must produce
byte-for-byte identical passwords.

The first release targets Chromium browsers. Firefox support follows once the
shared UI and core are stable; browser-specific code must stay behind a narrow
platform adapter rather than touching the derivation core.

## Status (2026-08-29)

Phases 0–3 are implemented on branch `claude/browser-extension-plan-iy0cq6`:

- **Shared core extracted** to a repo-root `shared/` (core, assets, tokens,
  golden vectors); npm tooling hoisted to the root. The PWA imports it unchanged.
- **Popup and options built** (`npm run build:ext` → `extension/dist`), reusing
  the shared core and visual language. Active-tab autofill fills the app label
  and (via per-site presets) the username; `Alt+Shift+M` opens the popup.
- **Parity verified**: the built popup reproduces the shared 42-char golden
  vector byte-for-byte in a Chromium DOM smoke test; adapter and manifest have
  unit tests. Remaining work is Phase 4 (load-unpacked/browser hardening,
  Firefox) and Phase 5 (signed release). The implemented layout differs from the
  original sketch below only in that npm tooling lives at the repo root.

---

## Feature parity

| Capability | PWA | Extension plan |
| --- | --- | --- |
| Create, apply, copy, and locally retain a Profile Code | Yes | Same explicit “Use this code” behavior in the options/profile page |
| App/device label and username | Manual entry | Editable; offer the current site's registrable host as a convenience, never a hidden input |
| Master secret | Entered for each derivation; cleared on generate | Same; clear field in a `finally` block after generation |
| Friendly words / Compact characters | Yes | Same shared formatters and word bank |
| Recommended / exact length | 42 words, 20 characters, or 12–64 exact | Same shared settings and labels |
| Separator, credential kind, and rotation version | Yes | Same controls, secondary fields collapsed under "More options" |
| Descriptive strength guidance | Yes | Same shared guidance module; no sample-appearance entropy score |
| Copy result | Explicit button | Explicit copy button; optional direct fill is deferred |
| Credential presets | None | Save label+username+style presets locally (no secret); open a preset to pre-fill the popup |
| Light/dark theme | System default plus remembered override | Same tokens and behavior via extension-local storage |
| Offline use | Installed PWA shell | Inherent: all code, WASM, icons, and word banks ship in the extension package |
| Install and connectivity indicators | PWA-specific | Omit; irrelevant in an extension context |
| Version display | Package version | Read from the extension manifest via `chrome.runtime.getManifest()` |
| V1 compatibility | Available | Include at launch unless bundle size review shows a material cost |
| Keyboard shortcut | n/a | Default `Alt+M` (or platform equivalent) to open the popup; configurable via the browser's extension shortcut settings |

---

## Shared-code layout

Before building the popup, extract code without changing any behavior.
The extraction must be its own reviewed commit so any accidental compatibility
change is immediately visible in the diff.

```text
shared/
  core/
    derive-v2.js          ← unchanged from web/src/core/derive-v2.js
    generation-settings.js
    legacy.js
    profile.js
    symbols.js            ← must be included; derive-v2.js imports it directly
    word-bank.js          ← platform-neutral loader (see below)
  assets/
    word-bank-v1.txt
    word-bank-v2.txt
  test/
    vectors.js            ← golden V1+V2 vectors imported by both test suites
web/
  src/                    ← imports from ../../shared/core/
  public/
    word-bank-v1.txt      ← symlink or copy step in web build
    word-bank-v2.txt
extension/
  src/
    popup/
    options/
    platform/             ← narrow adapter for storage, activeTab, version
  public/
    manifest.json
    word-bank-v1.txt      ← copied by extension build
    word-bank-v2.txt
```

Rules:
- Moving files is allowed; changing exports, constants, word-bank bytes,
  golden outputs, or algorithm behavior during extraction is not.
- Keep one golden-vector suite at the shared boundary, then add small
  app-specific tests for asset loading and UI wiring.
- Do not publish a second implementation of Argon2, context encoding,
  deterministic expansion, formatting, or length guidance.

### Word-bank loader

`web/src/core/word-bank.js` currently uses `document.baseURI`, which is
DOM-coupled and will not work identically in an extension popup. Refactor it
to accept a URL string (or URL factory) so both clients can supply the right
base:

```js
// shared/core/word-bank.js
const cache = new Map();

export async function loadWordBank(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`Could not load word bank: ${url}`);
      return (await response.text()).split(/\r?\n/).filter(Boolean);
    }));
  }
  return cache.get(url);
}
```

PWA call site: `loadWordBank(new URL("word-bank-v2.txt", document.baseURI))`
Extension call site: `loadWordBank(chrome.runtime.getURL("word-bank-v2.txt"))`

Both resolve to an HTTPS URL that `fetch()` accepts. The shared module never
imports a DOM global or `chrome.*` directly.

---

## Extension architecture

### Popup (everyday path)

The popup is the action the user opens from the toolbar. It mirrors the
compact PWA form and result card:

- **Profile summary** — collapsed once configured, showing "Ready on this
  device." Tapping/clicking opens the options page rather than expanding
  inline (avoids cramming recovery-sensitive actions into the popup).
- **Core form** — app/device label (with host suggestion), username,
  master secret, style, length mode, and separator. Secondary controls
  (kind, version/slot) under "More options."
- **Result card** — generated password, strength badge, copy button,
  status line.

Popup dimensions: design for **380 × 560 px** as the default size and test
at 320 × 480 px (minimum) and 420 × 620 px (maximum common size). The
popup is always single-column regardless of window width.

Keyboard flow: Tab through form fields in DOM order, Enter to submit,
`Ctrl+C` when the result is focused to copy. Announce errors and the result
via `aria-live="polite"`.

The popup:
- Reads non-secret settings from extension-local storage via the platform
  adapter.
- Derives in its own document context (no background service worker needed).
- Displays the result and clears the master-secret field in a `finally`
  block.
- Does not log inputs or generated output.
- Discards all transient state on popup closure.

### Options/profile page

A full-page extension options document for:
- Profile Code creation, explicit apply-after-paste, copy, and backup guidance.
- Credential preset management (create/edit/delete label+username presets).
- Theme preference.
- Version information.

This avoids cramming recovery-sensitive actions into the popup. Use
`chrome.runtime.openOptionsPage()` from the popup's profile summary to open
it. Profile Codes are public salts, but the UI must still tell users to
retain a recovery copy.

### Platform adapter

Create a narrow adapter (`extension/src/platform/`) for:

| Surface | Adapter function |
| --- | --- |
| `chrome.storage.local` | `storage.get(key)` / `storage.set(key, value)` |
| Active-tab host suggestion | `getActiveTabHost()` → registrable domain or `null` |
| Version | `getAppVersion()` → string from `chrome.runtime.getManifest().version` |
| Word bank URL | `wordBankUrl(version)` → `chrome.runtime.getURL(...)` |

Shared UI modules consume the adapter and never import `chrome.*` or
`browser.*` directly. A Firefox adapter can later wrap the Promise-based
WebExtensions API without touching any shared code.

No background service worker is required for generation. Add one only if a
future feature (e.g., alarm-based clipboard clear) genuinely needs browser
lifecycle events.

### Build system

The PWA and extension share one repository and one Webpack configuration
with multiple entry points:

```js
// webpack.config.cjs  (simplified)
const entries = {
  web: { entry: "./web/src/index.js",    output: "web/dist" },
  popup: { entry: "./extension/src/popup/index.js",   output: "extension/dist" },
  options: { entry: "./extension/src/options/index.js", output: "extension/dist" },
};
```

Both builds resolve `shared/core/*` modules from the same path. Word banks
are copied into each build's output directory by `CopyWebpackPlugin`.
`devtool: false` on production builds for both.

The extension build produces an unpacked directory that loads directly
via "Load unpacked" in Chrome. A zip of that directory is the store artifact.

---

## Design token sharing

The PWA's design language lives in `web/public/style.css`. For the extension
to match, extract the design tokens into a shared file that both builds
import:

```text
shared/
  styles/
    tokens.css    ← CSS custom properties for both light and dark themes
```

`tokens.css` defines `:root { --plum: … --lavender: … }` and the
`[data-theme="dark"]` overrides. Both `web/public/style.css` and
`extension/src/popup/popup.css` `@import` it (or include it via
`CopyWebpackPlugin`). Component-specific layout lives in each client's own
stylesheet. This ensures the same plum/lavender/cream/peach/ink palette
appears in both surfaces without duplication.

---

## Permissions and content isolation

Start with only `storage` and `activeTab`. Do not request broad host
permissions, remote code, analytics, network access, password-manager
access, history, or clipboard-read. Clipboard-write happens only from a user
click; use the document Clipboard API (`navigator.clipboard.writeText`),
which works in extension popup documents without an added permission.

The manifest CSP must explicitly allow the bundled Argon2 WebAssembly. MV3's
default CSP blocks `wasm-unsafe-eval`, so add it:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'none';"
}
```

The production bundle must contain no source maps, remote URLs, secret
logging, or dynamic code loading.

**Phase 1 deliberately uses copy/paste.** Direct password-field filling
requires a content script and creates a larger trust boundary with page DOMs,
frames, and host permissions. Consider it only after the core extension is
reviewed and stable, and make it an explicit click targeting the currently
focused password field. Never pass the master secret into a content script
or page context.

---

## Local convenience features

After parity, the highest-value additions are:

1. **Credential presets** — local presets containing only app label, username,
   kind, slot, style, separator, and length policy. Never store a master
   secret or output. The popup shows a preset picker at the top; selecting
   one pre-fills the form and focuses the secret field. Presets are created
   from the options page or directly in the popup after a successful
   derivation ("Save these settings").

2. **QR and `.mimi-profile` transfer** — for the public Profile Code, shared
   with the PWA so phone-to-desktop setup is less error-prone. Target the
   options page; QR scanning is deferred until the extension context allows
   a suitable library.

3. **Per-site compatibility presets** — for sites with an unusual maximum
   length or symbol policy. The preset must be visible before generation
   because every setting affects reproducibility.

4. **Update/release note** — a one-time notice in the options page when
   compatibility-sensitive behavior changes (e.g., a new algorithm ID).

Do not add cloud sync or Mimi accounts. Browser-vendor sync is also deferred:
its quotas, account coupling, and recovery semantics need a separate product
decision even though the Profile Code is public.

---

## Implementation sequence

### Phase 0 — compatibility baseline (complete)

- Tag or otherwise record the tested PWA release and keep its golden outputs.
- Add recommended-default vectors for 42-character words and 20-character
  characters (done in `web/test/generators.test.js`).
- Record bundle contents and performance on a representative phone and laptop.

Exit condition: current PWA build and all shared vectors pass from a clean
checkout. ✓

### Phase 1 — shared core extraction

- Move `derive-v2.js`, `generation-settings.js`, `legacy.js`, `profile.js`,
  `symbols.js` to `shared/core/` verbatim (content unchanged).
- Refactor `word-bank.js` to accept a URL string (see above) and move it to
  `shared/core/`. Update the PWA call site to pass
  `new URL("word-bank-v2.txt", document.baseURI)`.
- Move word banks to `shared/assets/`; copy or symlink them into
  `web/public/` as part of the web build.
- Move golden/property tests to `shared/test/vectors.js` and have the web
  test suite import from there.
- Extract `shared/styles/tokens.css` from `web/public/style.css`.
- Update `webpack.config.cjs` to resolve `shared/core/*` from both builds.
- Verify the deployed PWA still reproduces every V1/V2 vector.

Exit condition: only paths and build wiring changed; generated outputs, UI
behavior, and golden vector results did not.

### Phase 2 — extension shell and popup

- Add a Manifest V3 build producing an unpacked extension directory.
- Implement the platform adapter (`storage`, `getActiveTabHost`,
  `wordBankUrl`, `getAppVersion`).
- Implement the popup: theme, profile summary, core form, recommended/exact
  length guidance, generation, result, copy, and version display.
- Add active-tab host suggestion; show the suggestion as a clearable chip
  above the app label field. The user must see and be able to edit it.
- Package Argon2 WASM and word banks locally; add `wasm-unsafe-eval` to CSP.
- Add the default `Alt+M` keyboard shortcut in `manifest.json`.

Exit condition: loading the unpacked extension with network disabled can
derive both styles and match shared golden vectors.

### Phase 3 — options/profile page

- Implement create/apply/copy and clear inline feedback; applying a typed or
  pasted code must be an explicit action.
- Add recovery and cross-device instructions.
- Implement credential preset management (list, create, edit, delete).
- Verify corrupted Profile Codes fail without overwriting the valid saved code.

Exit condition: a Profile Code exported from the PWA imports into the
extension and reproduces the same password, and vice versa. Presets round-trip
through extension-local storage and restore the form correctly.

### Phase 4 — hardening and browser coverage

- Audit requested permissions and production bundle contents.
- Test popup lifecycle: field clearing, state on rapid open/close, memory.
- Test keyboard navigation, screen reader labels, `aria-live` announcements,
  light/dark themes, zoom levels (80 %–150 %), narrow popup widths, and
  reduced motion.
- Test Chrome and Edge on macOS and Windows; then add a Firefox-flavored
  `manifest.json` and test with `web-ext`.
- Measure Argon2 latency in the popup context (different from service worker
  / Node); ensure UX is acceptable without weakening shared parameters.

Exit condition: no network request occurs during setup or generation; no
secret persists after popup closure; permissions are minimal; all
compatibility, UI, and package checks pass.

### Phase 5 — signed release

- Prepare store descriptions and privacy disclosures stating secrets are
  processed locally and no user data is collected or transmitted.
- Rebuild from a clean tagged commit and compare the package inventory.
- Publish to Chrome Web Store and Firefox Add-ons gradually.
- Retain the signed artifact and document rollback to the previous version.
- Record the PWA/extension compatibility matrix in the release notes.

Exit condition: store packages are traceable to the reviewed source tag;
PWA and extension produce identical outputs for every golden vector.

---

## Cross-browser strategy

The platform adapter is the only browser-specific code. For Firefox:

- Use `webextension-polyfill` (`mozilla/webextension-polyfill`) to normalize
  the Promise-based WebExtensions API for Chrome/Edge without code duplication.
- Add a Firefox-specific `manifest.json` entry for `browser_specific_settings`
  and the `applications` key.
- Test with `web-ext lint` and `web-ext run` on Firefox.

The shared core, word banks, and Argon2 WASM are identical across browsers.

---

## Test matrix

- **Shared golden outputs** — V1 legacy vectors plus V2 20-, 32-, and
  42-character vectors under production Argon2 parameters. These live in
  `shared/test/vectors.js` and are imported by both the web and extension
  test suites.
- **Properties** — exact length 12–64, required character classes, both
  separators, all credential kinds, Unicode normalization, slots, and unique
  word-bank data.
- **Cross-client** — export/import one Profile Code; compare PWA and extension
  outputs for every style and length mode.
- **Storage** — no master secret or output in local/sync storage, IndexedDB,
  logs, or extension messages.
- **Permissions** — assert the packaged manifest contains only the reviewed
  permission set.
- **Offline/package** — fail the build for remote URLs, missing WASM/word-bank
  assets, source maps, or unexpected files. Assert `wasm-unsafe-eval` is in
  the CSP and no other `unsafe-*` directive appears.
- **UI** — popup at 320 px, 380 px (design target), and 420 px; keyboard-only
  use; accessible labels and live feedback; theme parity; clear errors for
  missing/invalid inputs.
- **Presets** — round-trip create/edit/delete and restore into popup form.

---

## Explicitly deferred

- Direct password-field filling and content scripts.
- Browser-vendor sync, Mimi accounts, or any backend.
- Saving or caching the master secret or generated passwords.
- Automatic policy detection from arbitrary pages.
- V3 multi-character composition policies.
- Mobile browser-extension support (varies substantially by platform).
- QR scanning in the extension (requires a compatible library and extra CSP).
