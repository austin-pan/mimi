# Security review (2026-08-29)

A review of every avenue by which Mimi could leak or weaken a secret. Mimi has
**not** had an independent cryptographic audit; this is an internal review of the
web PWA and the browser extension.

## What must be trusted (the TCB)

Mimi derives passwords locally, so every line of code shipped in the bundle runs
in the same origin with full access to the master secret and the generated
password. The trusted computing base is therefore:

- The app's own code (`shared/core`, `web/src`, `extension/src`).
- `hash-wasm` — Argon2id. **Essential and irreplaceable**; it is the security of
  V2. Kept as a pinned dependency.
- `qrcode-generator` — renders the **public** Profile Code as a QR. In the TCB
  because it is bundled, though it only ever processes public data.
- The browser, its Web Crypto implementation, and the delivery channel
  (GitHub Pages / the extension store).

`seedrandom` was removed as a dependency and its ARC4 core **vendored** into
`shared/core/seedrandom.js` (V1 compatibility only). `jsqr` was removed entirely
with the in-app QR scanner. Runtime dependencies are now just `hash-wasm` and
`qrcode-generator`.

## Controls in place

- **No network egress for secrets.** CSP is `default-src 'self'` with
  `connect-src 'self'` and no external hosts, so even malicious bundled code
  cannot exfiltrate the secret over the network. The bundle contains no
  `fetch`/XHR/WebSocket/`sendBeacon` to any external origin (the only `fetch`
  loads same-origin word banks; the only `http(s)` string in the bundle is the
  SVG XML namespace, plus the extension's own PWA deep-link, which is encoded
  into a QR, never requested).
- **The master secret is never persisted, logged, copied, or put in a URL.** It
  lives only in the form field during derivation and is cleared in a `finally`
  block. There is **no `console.*` anywhere** in the shipped code. Local storage
  holds only the public Profile Code, the theme choice, and (extension) non-secret
  per-site presets (app label, username, style — never a secret or output).
- **No dynamic code.** No `eval`, `new Function`, `document.write`, or string
  timers. `script-src` omits `unsafe-inline`/`unsafe-eval`; `wasm-unsafe-eval` is
  present only to permit the bundled Argon2 WASM.
- **Safe DOM.** The only `innerHTML` writes are our own generated QR SVG (the
  payload is encoded into QR modules as numeric path data, never echoed into
  markup) and static icon strings. Results use `textContent`. No inline styles.
- **Sound randomness.** V2 uses `crypto.getRandomValues` for the 128-bit salt and
  is otherwise fully deterministic: an SP 800-108-style counter-mode KDF
  (`HMAC-SHA256(argon2Key, label ‖ context ‖ counter)`, a length-extension-
  resistant standard PRF) expands the Argon2id output, with rejection sampling
  for unbiased selections. There is no `Math.random` in the core. V1's weak
  `seedrandom` is compatibility-only and clearly marked.
- **Golden vectors** fail the build if any released algorithm output changes.
- **Minimal extension surface.** Permissions are `storage` + `activeTab` only —
  no host permissions, no content scripts, no background worker, no clipboard-read,
  no camera. Egress is blocked by the absence of host permissions; the manifest
  CSP forbids remote scripts.
- **Deployment isolation.** The per-push CI is read-only; only the
  manual-dispatch `deploy.yml` holds `contents: write`. Dependencies are pinned
  with integrity hashes and installed via `npm ci`.

## Hardening applied in this review

- Tightened the web CSP: dropped the unused `img-src data:` (now `img-src 'self'`)
  and made `worker-src 'self'` and `manifest-src 'self'` explicit.
- Minimized the supply chain: vendored `seedrandom`, removed `jsqr` and the
  camera scanner (redundant with the QR display + a phone's native camera).

## Residual risks (accepted / out of scope)

1. **Compromised deployment or update** — the dominant risk for any web-delivered
   crypto tool. A malicious release could capture future inputs regardless of any
   in-app control. Mitigated by keeping the code minimal, same-origin, auditable,
   reproducibly built, dependency-pinned, and offline-capable. **Recommended
   further steps:** pin GitHub Actions to commit SHAs, enable branch protection and
   required review on workflow/core changes, and protect the account with passkeys
   or 2FA.
2. **No response-header security on GitHub Pages** — `frame-ancestors` /
   `X-Frame-Options` cannot be set via a `<meta>` CSP and GitHub Pages does not let
   you set headers, so the page can be framed (clickjacking). Low impact here (the
   only actions are generate/copy on device), but a custom host or CDN that sets
   headers would close it. Meta CSP also applies only after parsing begins.
3. **Browser memory cannot be zeroized** — JS strings for the secret/password may
   linger until garbage-collected. Inherent to the platform.
4. **A destination device can observe a typed password**, and a **known password
   still allows offline master-secret guessing** (Argon2 raises the cost but cannot
   rescue a weak secret). Out of Mimi's control; use a strong random secret and
   enable passkeys/MFA where available.
5. **`qrcode-generator` remains third-party.** It only touches the public code and
   is egress-locked, but for maximum minimalism it could be vendored+pinned or the
   QR display dropped in favor of file + copy/paste.

## Verdict

No secret-leaking avenue was found. Network egress is locked, the secret never
leaves the field, the dependency surface is now two libraries (one essential, one
public-data-only), and the extension is minimally scoped. The remaining risks are
inherent to web delivery and the platform, not defects in the app. An independent
cryptographic audit is still recommended before Mimi is used for high-value
credentials.
