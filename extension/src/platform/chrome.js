// The only browser-specific module. Shared UI code consumes this adapter and
// never touches the WebExtensions API directly.
//
// Chrome exposes only `chrome.*`; Firefox exposes both `browser.*` (Promise-
// based) and a `chrome.*` compatibility alias. Preferring `browser` when present
// gives Promise-returning APIs on Firefox while still resolving to `chrome` on
// Chromium — so the same bundle runs on both, with no `webextension-polyfill`
// dependency. Firefox packaging then only needs the manifest's gecko settings.
// Resolved per call (not at module load) so the global can be installed after
// this module is imported, e.g. by unit-test mocks.
function api() {
  return globalThis.browser ?? globalThis.chrome;
}

export const storage = {
  async get(key) {
    const result = await api().storage.local.get(key);
    return result[key];
  },
  async set(key, value) {
    await api().storage.local.set({ [key]: value });
  },
  async remove(key) {
    await api().storage.local.remove(key);
  },
};

export function getAppVersion() {
  return api().runtime.getManifest().version;
}

// Word banks and Argon2 WASM ship inside the extension package, so this resolves
// to a local extension URL — no network access.
export function wordBankUrl(version) {
  return api().runtime.getURL(`word-bank-${version}.txt`);
}

export function openOptions() {
  api().runtime.openOptionsPage();
}

// A convenience label for the site the user is on. activeTab grants access to
// the active tab's URL when the user invokes the extension (click or shortcut),
// so no broad host permission is needed. The user always sees and can edit the
// result before it becomes part of the deterministic context.
export async function getActiveTabHost() {
  try {
    const [tab] = await api().tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return null;
    const url = new URL(tab.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
