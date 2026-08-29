// The only browser-specific module. Shared UI code consumes this adapter and
// never touches chrome.*/browser.* directly, so a Firefox adapter can later
// wrap the Promise-based WebExtensions API without changing anything else.

export const storage = {
  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },
  async remove(key) {
    await chrome.storage.local.remove(key);
  },
};

export function getAppVersion() {
  return chrome.runtime.getManifest().version;
}

// Word banks and Argon2 WASM ship inside the extension package, so this resolves
// to a local chrome-extension:// URL — no network access.
export function wordBankUrl(version) {
  return chrome.runtime.getURL(`word-bank-${version}.txt`);
}

export function openOptions() {
  chrome.runtime.openOptionsPage();
}

// A convenience label for the site the user is on. activeTab grants access to
// the active tab's URL when the user invokes the extension (click or shortcut),
// so no broad host permission is needed. The user always sees and can edit the
// result before it becomes part of the deterministic context.
export async function getActiveTabHost() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return null;
    const url = new URL(tab.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
