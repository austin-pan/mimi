# Mimi native mobile implementation plan

## Decision summary

Build a single React Native application with Expo for iOS and Android. Keep Mimi
backend-free and account-free. Reuse the canonical profile, input normalization,
formatting, word-bank, QR, file, and golden-vector code where the runtime permits;
put Argon2id behind a narrow native Expo Module so the native app reproduces the
existing V1/V2 outputs without depending on WebAssembly support in Hermes.

Use an Expo development build from the first derivation spike rather than Expo
Go. The cryptographic bridge and production deep-link configuration require
native code and app configuration. EAS Build can produce preview and production
binaries, but the project must also remain locally buildable with Xcode and
Android Studio.

## Goals

- Reproduce every frozen Mimi password byte-for-byte across PWA, extension,
  iOS, and Android.
- Generate entirely on-device with no account, backend, telemetry, or network
  requirement.
- Create, apply, scan, copy, share, export, and import the same public Profile
  Code and `.mimi-profile` format.
- Provide a pleasant native interface with the same recommended/exact length,
  strength guidance, themes, Traveling Spark identity, and compatibility modes.
- Accept Mimi QR/deep links directly in the installed app on both platforms.
- Never store the master secret or generated passwords by default.

## Non-goals for the first release

- Password-manager autofill or an iOS Credential Provider extension.
- Account sync, cloud backup, or recovery of a lost Profile Code.
- Password history, secret history, analytics, ads, or remote generation.
- Changing the V1/V2 derivation algorithms or checked-in word banks.
- Automatic migration of Safari/PWA local storage into the native sandbox.

## Architecture

```text
React Native screens (Expo Router)
        │
        ├── profile workflows ── SecureStore / files / clipboard / camera
        ├── generation form
        └── result presentation
                 │
          mobile domain adapter
                 │
      shared Mimi core (TypeScript/JS)
        ├── canonicalize inputs
        ├── profile + file formats
        ├── V1 compatibility
        ├── V2 formatters / word bank
        └── strength / length settings
                 │
          Argon2id interface
          ┌──────┴──────┐
       iOS Swift     Android Kotlin
       native lib     native lib
```

The shared core must not import DOM, Node, `chrome.*`, React Native, or Expo
globals. Platform code supplies storage, random bytes, clipboard, URLs, files,
camera scans, and Argon2id through explicit adapters.

## Repository layout

```text
shared/
  core/                    existing canonical algorithms and formats
  assets/                  frozen word banks
  test/                    golden vectors shared by every client
mobile/
  app/                     Expo Router routes
  src/components/          native UI components
  src/features/profile/    profile state and transfer workflows
  src/features/generate/   form and result workflow
  src/adapters/            storage, random, clipboard, files, links
  src/crypto/              Argon2 interface and error mapping
  modules/mimi-argon2/     local Expo Module: Swift + Kotlin
  test/                    adapter, navigation, and integration tests
  app.config.ts
  eas.json
```

Prefer a root npm workspace so `mobile` consumes `shared` directly and one
lockfile gates all clients. Do not publish the shared core to a registry.

## Data and security model

### Stored

- Active public Profile Code.
- Theme and non-sensitive UI preferences.
- Optional last-used style and separator only if product testing shows value.

Store the small Profile Code in `expo-secure-store` for predictable app-local
persistence, while continuing to tell users that it is public and needs an
external recovery copy. SecureStore is not the only recovery copy.

### Never stored by default

- Master secret.
- Generated password.
- Complete credential recipes, usernames, or account history.
- Clipboard contents read without a user action.

Clear secret and password state when generation completes, when the app enters
the background, and after a short foreground inactivity timeout. Screen-capture
blocking can be offered on Android, but should not be presented as complete
protection; iOS screenshot prevention is limited.

Biometric authentication is optional and should gate opening the active profile
or app UI, not replace the master secret. It does not add entropy to derived
passwords.

## Compatibility contract

1. Move implicit browser dependencies out of `shared/core` behind adapters.
2. Define a `DerivationEngine` interface whose inputs and errors are identical
   across web and native.
3. Implement Argon2id natively with exactly the frozen V2 parameters, byte
   encoding, salt bytes, output length, and version.
4. Run the existing golden vectors against Swift and Kotlin in native unit tests.
5. Run cross-client fixture tests that parse the same Profile Code and generate
   the same password for every style and supported length.
6. Refuse release if a native output differs by even one byte or character.

Do not silently substitute another KDF when native Argon2 fails. Show a local
error and generate nothing.

## App flows

### First run

1. Explain in one screen that Mimi has no account and the Profile Code is the
   portable recovery item.
2. Create a profile from OS cryptographic random bytes.
3. Activate it locally.
4. Require the user to choose at least one backup action: show QR, copy, or save
   `.mimi-profile`. Allow skipping only after a clear warning.

### Generate

1. Enter App or device, Username, Secret, Style, Separator, Version, and Length.
2. Keep legacy password type under Older password settings for compatibility.
3. Derive off the UI thread and show progress/cancellation affordances.
4. Display the result with Copy and a short auto-clear countdown.
5. Clear the Secret in a `finally` block regardless of success or failure.

### Transfer and deep links

- Scan Mimi QR codes inside the app with `expo-camera`.
- Register an HTTPS universal link / Android App Link for the deployed Mimi
  origin and a private `mimi://profile/...` fallback scheme.
- Validate the profile checksum before writing anything.
- Show a preview, then Apply; collapse the profile surface and show a toast.
- Import `.mimi-profile` through the platform document picker and share sheet.
- Export through a temporary cache file and system share sheet; delete the
  temporary file afterward.
- Treat every inbound URL, QR payload, shared text, and file as untrusted input.

Universal links require hosting Apple association metadata and Android Digital
Asset Links under the GitHub Pages origin. Test installed, uninstalled, and
browser-fallback behavior on physical devices before release.

## Native dependencies to evaluate

- `expo-router` for typed routes and deep-link routing.
- `expo-secure-store` for the active Profile Code and settings requiring
  protected persistence.
- `expo-camera` for QR scanning.
- `expo-clipboard` for explicit Copy/Paste actions.
- `expo-file-system`, document picker, and `expo-sharing` for profile files.
- `expo-local-authentication` for an optional app-lock preference.
- `expo-haptics` for restrained success feedback.
- A reviewed Argon2 library wrapped by a local Expo Module.

Pin dependencies and record why each native permission exists. Camera permission
is requested only when Scan is selected; Face ID text is added only if app lock
ships. Avoid analytics and crash-reporting SDKs in the first release because
credential-shaped metadata is unusually sensitive.

## UI structure

- **Generate:** primary form and result.
- **Profile sheet:** active summary, Apply code, New profile, Scan QR, Show QR,
  Copy, Save file, and Load file.
- **Settings:** theme, result auto-clear duration, biometric app lock, About,
  algorithm compatibility information, and recovery warning.
- **Onboarding/recovery:** first profile creation and backup confirmation.

Share design tokens and semantic names, not CSS. Implement a small native token
module for light/dark colors, typography, spacing, radii, and motion. Respect
Dynamic Type, reduced motion, screen readers, switch control, and minimum touch
targets.

## Delivery phases

### Phase 0 — compatibility spike

- Scaffold `mobile` with TypeScript, Expo Router, and a development build.
- Extract the derivation interface.
- Implement the smallest Swift/Kotlin Argon2 bridge.
- Pass one V2 character and one V2 word golden vector on both platforms.

Exit: physical iOS and Android devices reproduce the web outputs.

### Phase 1 — shared core and profile foundation

- Make shared modules platform-neutral.
- Add SecureStore, OS random, clipboard, and profile state adapters.
- Implement create, paste/apply, copy, and recovery warning.
- Run the complete profile/parser and derivation vector suite natively.

Exit: profile and all V1/V2 fixtures pass without network access.

### Phase 2 — generation experience

- Build the native form, recommended/exact lengths, strength guidance, result,
  auto-clear, themes, and accessibility behavior.
- Keep legacy type available only under Older password settings.
- Add background-state clearing and derivation cancellation/error handling.

Exit: all supported styles and lengths match the PWA on both platforms.

### Phase 3 — portable transfer

- Add in-app QR scan/display, file import/export, share intake, custom scheme,
  Universal Links, and Android App Links.
- Add malformed/corrupt/oversized payload tests and replay-safe UI behavior.

Exit: PWA ↔ iOS ↔ Android transfer works in every direction on physical devices.

### Phase 4 — hardening and beta

- Threat-model native storage, clipboard lifetime, screenshots, logs, deep links,
  OTA updates, dependency compromise, and lost-profile recovery.
- Add optional biometric app lock.
- Run accessibility, localization expansion, low-memory, airplane-mode, upgrade,
  reinstall, backup/restore, and device-migration tests.
- Distribute through TestFlight and Play internal testing.

Exit: release checklist, privacy disclosure, store metadata, support page, and
rollback procedure are approved.

### Phase 5 — production

- Create signed store builds and staged rollouts.
- Monitor only aggregate store-provided crash/health signals; do not add input
  analytics.
- Publish JavaScript-only fixes through a staging OTA channel first, then
  production after vector and device checks.

## Testing strategy

- **Golden vectors:** every algorithm/style/length and Unicode normalization
  boundary, on JavaScript, Swift, and Kotlin.
- **Property tests:** exact length, required character classes, deterministic
  replay, and separation when recipe inputs change.
- **Parser fuzzing:** Profile Codes, QR URLs, shared text, and profile files.
- **Component tests:** validation, collapse/toast behavior, secret clearing,
  accessibility labels, and compatibility disclosure.
- **Device E2E:** first run, background/restore, QR scan, universal link, file
  round trip, offline generation, app upgrade, and biometric fallback.
- **Cross-client release fixture:** one checked-in profile and recipe matrix must
  match PWA, extension, iOS, and Android in CI.

## Release and OTA policy

Use development, preview, and production build profiles with separate update
channels. Bind OTA updates to an explicit runtime version; increment it whenever
native modules, permissions, Expo SDK, or app configuration change. Enable Expo
update code signing before production and embed a known-good bundle in every
binary so offline launch and rollback remain possible.

An OTA update that touches shared derivation code must pass the same review and
golden-vector gate as an App Store binary. Never use OTA delivery to bypass store
review for native behavior.

## Principal trade-offs

- **Native Argon2 bridge:** more Swift/Kotlin maintenance, but predictable
  performance and exact compatibility. A pure JS substitute is simpler only if
  it can prove acceptable performance and byte parity on Hermes.
- **SecureStore for a public profile:** semantically stronger than required, but
  offers stable app-local protection and optional authentication. It is not a
  backup system.
- **No account/backend:** maximum privacy and offline reliability, at the cost of
  user-managed profile recovery.
- **Expo development builds:** slightly more setup than Expo Go, but required for
  production native libraries and representative testing.
- **OTA updates:** faster fixes, but a compromised update could capture future
  secrets. Code signing, channels, runtime pinning, and strict review are
  mandatory.

## Decisions to revisit later

- Whether users want an optional encrypted, user-controlled profile backup.
- Whether a Credential Provider / Autofill extension is worth its much larger
  native security and store-review surface.
- Whether recipes—not secrets or passwords—should be optionally stored.
- Whether the native Argon2 module should become a separately audited package.
- Whether app-lock biometrics meaningfully improve the no-history product.

