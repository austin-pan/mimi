# Mimi browser extension implementation plan

## Outcome

Build a Manifest V3 extension that feels like the Mimi PWA in a browser-sized
surface, remains fully local and offline, and imports the same shared generator
modules and assets. Given identical inputs, the PWA and extension must produce
byte-for-byte identical passwords.

The first release should target Chromium browsers. Firefox support follows once
the shared UI and core are stable; browser-specific code must stay behind a
small adapter rather than entering the derivation core.

## Feature parity

| Capability | PWA | Extension plan |
| --- | --- | --- |
| Create, import, copy, and locally retain a Profile Code | Yes | Same behavior in an options/profile panel |
| App/device label and username | Manual | Editable; offer the current site's registrable host as a convenience, never a hidden input |
| Master secret | Entered for each derivation; never stored | Same; keep only in popup memory and clear the field after generation |
| Friendly words / Compact characters | Yes | Same shared formatters and word bank |
| Recommended / exact length | 42 words, 20 characters, or 12–64 exact | Same shared settings and labels |
| Separator, credential kind, and rotation version | Yes | Same controls, with secondary fields collapsed |
| Descriptive strength guidance | Yes | Same shared guidance; no sample-appearance entropy score |
| Copy result | Explicit button | Explicit copy button; optional direct fill is deferred |
| Light/dark theme | System default plus remembered override | Same tokens and behavior using extension-local storage |
| Offline use | Installed PWA shell | Inherent: all code, WASM, icons, and word banks ship in the extension |
| Install and connectivity indicators | PWA-specific | Omit; browser installation and network state do not affect generation |
| Version display | Package version | Read from the extension manifest/build metadata |
| V1 compatibility | Available | Include at launch unless bundle review shows a material cost |

## Shared-code layout

Before building the popup, extract code without changing behavior:

```text
shared/
  core/
    derive-v2.js
    generation-settings.js
    legacy.js
    profile.js
    symbols.js
    word-bank.js
  assets/
    word-bank-v1.txt
    word-bank-v2.txt
  test/
    vectors.js
web/
  src/
  public/
extension/
  src/
    popup/
    options/
    platform/
  public/
    manifest.json
```

Both builds copy the shared word banks and import the same ES modules. Keep one
golden-vector suite at the shared boundary, then add small app-specific tests for
asset loading and UI wiring. Do not publish a second implementation of Argon2,
context encoding, deterministic expansion, formatting, or length guidance.

Moving files is allowed; changing exports, constants, word-bank bytes, or golden
outputs during extraction is not. Make the extraction its own reviewed commit so
any accidental compatibility change is obvious.

## Extension architecture

### Popup

The browser-action popup is the everyday path. It mirrors the compact PWA form
and result card, with Profile management collapsed once configured. When opened
on an HTTP(S) page, it may suggest the page's registrable host as the app label.
The user must see and be able to edit that value before generation because it is
part of the deterministic context.

The popup reads non-secret settings from extension-local storage, derives in its
own document, displays the result, and clears the master-secret input in a
`finally` block. It should not log inputs or generated output. Popup closure
discards transient state.

### Options/profile page

Use a full-page extension options document for Profile Code creation, import,
copy, backup guidance, theme preference, and version information. This avoids
cramming recovery-sensitive actions into the popup. Profile Codes remain public
salts, but the UI should continue to tell users to retain a recovery copy.

### Platform adapter

Create a narrow adapter for `storage.local`, active-tab host suggestions, and
manifest/version access. Shared UI modules consume the adapter and never import
`chrome.*` or `browser.*` directly. A Firefox adapter can later wrap the Promise-
based WebExtensions API.

No background service worker is required for generation. Add one only if a
future feature genuinely needs browser lifecycle events.

## Permissions and content isolation

Start with only `storage` and `activeTab`. Do not request broad host permissions,
remote code, analytics, network access, password-manager access, history, or
clipboard-read. Clipboard-write should happen only from a user click; prefer the
document Clipboard API if it works without an added permission.

Phase 1 deliberately uses copy/paste. Direct password-field filling requires a
content script and creates a larger trust boundary with page DOMs, frames, and
host permissions. Consider it only after the core extension is reviewed, and
make it an explicit click that targets the currently focused password field.
Never send the master secret into a content script or page context.

The manifest CSP must allow the bundled Argon2 WebAssembly implementation while
prohibiting remote scripts. The production bundle must contain no source maps,
remote URLs, secret logging, or dynamic code loading.

## Local convenience features

After parity, the highest-value additions are:

1. Local credential presets containing only app label, username, kind, slot,
   style, separator, and length policy. Never store a master secret or output.
2. QR and `.mimi-profile` transfer for the public Profile Code, shared with the
   PWA so phone-to-desktop setup is less error-prone.
3. Per-site compatibility presets for sites that impose an unusual maximum
   length or symbol policy. The preset must be visible before generation because
   every selected setting affects reproducibility.
4. An update/release note when compatibility-sensitive behavior changes.

Do not add cloud sync or accounts to the initial extension. Browser-vendor sync
is also deferred: its quotas, account coupling, and recovery semantics need a
separate product decision even though the Profile Code is public.

## Implementation sequence

### Phase 0 — compatibility baseline

- Tag or otherwise record the tested PWA release and keep its golden outputs.
- Add recommended-default vectors for 42-character words and 20-character
  characters.
- Record bundle contents and performance on a representative phone and laptop.

Exit condition: current PWA build and all shared vectors pass from a clean
checkout.

### Phase 1 — shared core extraction

- Move core modules and word banks to `shared/`.
- Point the PWA build at the shared modules/assets.
- Move golden/property tests to the shared boundary.
- Verify the deployed PWA still reproduces every V1/V2 vector.

Exit condition: only paths and build wiring changed; generated outputs and UI
behavior did not.

### Phase 2 — extension shell and popup

- Add a Manifest V3 build producing an unpacked extension directory.
- Implement theme, Profile presence summary, core form, recommended/exact length
  guidance, generation, result, copy, and version display.
- Add the active-tab host suggestion through the platform adapter.
- Package Argon2 WASM and word banks locally.

Exit condition: loading the unpacked extension with network disabled can derive
both styles and match shared golden vectors.

### Phase 3 — options/profile page

- Implement create/import/copy and clear inline feedback.
- Add recovery and cross-device instructions.
- Verify corrupted Profile Codes fail without overwriting the valid saved code.

Exit condition: a Profile Code exported from the PWA imports into the extension
and reproduces the same password, and vice versa.

### Phase 4 — hardening and browser coverage

- Audit requested permissions and production bundle contents.
- Test popup lifecycle, field clearing, keyboard navigation, screen readers,
  light/dark themes, zoom, narrow widths, and reduced motion.
- Test Chrome and Edge on macOS and Windows; then add and test Firefox packaging.
- Measure Argon2 latency and memory behavior without weakening shared parameters.

Exit condition: no network request occurs during setup or generation, no secret
persists after popup closure, permissions are minimal, and all compatibility,
UI, and package checks pass.

### Phase 5 — signed release

- Prepare store descriptions and privacy disclosures stating that secrets are
  processed locally and no user data is collected.
- Rebuild from a clean tagged commit and compare the package inventory.
- Publish gradually, retain the signed artifact, and document rollback.

Exit condition: store packages are traceable to the reviewed source tag and the
PWA/extension compatibility matrix is recorded in the release notes.

## Test matrix

- Shared golden outputs: V1 legacy vectors plus V2 20-, 32-, and 42-character
  vectors under production Argon2 parameters.
- Properties: exact length 12–64, required character classes, both separators,
  all credential kinds, Unicode normalization, slots, and unique word-bank data.
- Cross-client: export/import one Profile Code and compare PWA/extension outputs
  for every style and length mode.
- Storage: no master secret or output in local/sync storage, IndexedDB, logs, or
  extension messages.
- Permissions: assert the packaged manifest contains only the reviewed set.
- Offline/package: fail the build for remote URLs, missing WASM/word-bank assets,
  source maps, or unexpected files.
- UI: popup at minimum supported width, keyboard-only use, accessible labels and
  live feedback, theme parity, and clear errors for missing/invalid inputs.

## Explicitly deferred

- Direct password-field filling and content scripts.
- Browser-vendor sync, Mimi accounts, or any backend.
- Saving or caching the master secret or generated passwords.
- Automatic policy detection from arbitrary pages.
- V3 multi-character composition policies.
- Mobile browser-extension support, which varies substantially by platform.
