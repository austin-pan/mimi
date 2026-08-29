# Testing and release

## Automated checks (run from the repo root)

```bash
npm ci
npm run build          # PWA → web/dist
npm run build:ext      # extension → extension/dist
npm test               # shared + web + extension unit suites
```

CI (`.github/workflows/pages.yml`) runs `npm ci`, `npm run build`, and `npm test`
read-only on every push to `master`/`main`. These cover the derivation golden
vectors, profile/QR/file logic, the QR encode→decode round-trip, generation
settings, and the extension adapter/manifest. They cannot exercise real service
workers or install flows — do those manually below.

## Deploying to GitHub Pages

Deployment is **human-triggered**, never automatic. Run the **Deploy Mimi to
Pages** workflow (`deploy.yml`) from the Actions tab. It builds, runs the test
suite, and force-publishes `web/dist` to the `gh-pages` branch. It is the only
workflow granted `contents: write`; the per-push test workflow stays read-only.

This was the chosen resolution of the "grant CI write access?" question: keep
automatic pushes read-only (no token that can rewrite the repo on every commit),
but remove the manual worktree toil with a one-click, build-and-test-gated,
human-initiated deploy.

### Rollback

Every deploy republishes the whole shell, so rolling back is just deploying an
earlier source: run **Deploy Mimi to Pages** and pick an earlier tag/commit as
the ref. It rebuilds that version and republishes it. Because installed PWAs
update through the service worker, a rolled-back deploy reaches clients on their
next load (they see the "new version" prompt); bump `CACHE_NAME` whenever cached
files change so the swap is clean.

## Manual device checklist (needs real devices)

Node tests cannot prove service-worker, install, or platform behavior.
Before calling a release done, verify on at least one iOS Safari and one Android
Chrome device:

- [ ] First load online, then enable airplane mode and reload — the app still
      opens and generates (offline shell cached).
- [ ] Install to home screen (iOS: Share → Add to Home Screen; Android: Install
      prompt) and confirm the icon is the plum "m" mark and the app opens
      standalone.
- [ ] Create a profile on one device; transfer it to another by **QR** (show it,
      scan with the receiving phone's native camera → the deep link opens Mimi
      and imports), by **`.mimi-profile` file**, and by **copy/paste**, and
      confirm all three reproduce the same password.
- [ ] Generate `words-v2` (42) and `characters-v2` (20); confirm exact lengths
      and that the master-secret field clears after generation.
- [ ] Toggle light/dark; confirm the sun/moon icon and colors follow.
- [ ] Deploy a new version and confirm the "new version is ready" banner appears
      and **Refresh** swaps to it without losing the saved profile.

## Extension checklist

- [ ] `npm run build:ext`, then load `extension/dist` unpacked at
      `chrome://extensions` (Developer mode).
- [ ] Open with the toolbar icon and with **Alt+Shift+M**.
- [ ] On an https page, the app label auto-fills from the tab host; after one
      generation the username auto-fills on the next visit.
- [ ] DevTools → Network shows zero requests during setup and generation.
- [ ] A profile exported from the PWA imports in the extension and reproduces the
      same password (and vice versa).
