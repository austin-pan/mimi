import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveTabHost,
  getAppVersion,
  storage,
  wordBankUrl,
} from "../src/platform/chrome.js";

function mockChrome({ tabs = [], version = "9.9.9" } = {}) {
  const store = {};
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) { return key in store ? { [key]: store[key] } : {}; },
        async set(entry) { Object.assign(store, entry); },
        async remove(key) { delete store[key]; },
      },
    },
    runtime: {
      getManifest() { return { version }; },
      getURL(pathname) { return `chrome-extension://mimi/${pathname}`; },
    },
    tabs: {
      async query() { return tabs; },
    },
  };
  return store;
}

test("storage adapter round-trips values", async () => {
  mockChrome();
  await storage.set("k", { a: 1 });
  assert.deepEqual(await storage.get("k"), { a: 1 });
  await storage.remove("k");
  assert.equal(await storage.get("k"), undefined);
});

test("adapter prefers Firefox's Promise-based browser.* over chrome.*", async () => {
  // chrome.* here would throw; the adapter must reach for browser.* on Firefox.
  mockChrome();
  globalThis.chrome.storage.local.get = () => { throw new Error("used chrome.*"); };
  const store = {};
  globalThis.browser = {
    storage: {
      local: {
        async get(key) { return key in store ? { [key]: store[key] } : {}; },
        async set(entry) { Object.assign(store, entry); },
      },
    },
  };
  try {
    await storage.set("k", { via: "browser" });
    assert.deepEqual(await storage.get("k"), { via: "browser" });
  } finally {
    delete globalThis.browser;
  }
});

test("getAppVersion reads the manifest version", () => {
  mockChrome({ version: "1.2.0" });
  assert.equal(getAppVersion(), "1.2.0");
});

test("wordBankUrl resolves a packaged asset URL", () => {
  mockChrome();
  assert.equal(wordBankUrl("v2"), "chrome-extension://mimi/word-bank-v2.txt");
});

test("getActiveTabHost returns the registrable-ish host for http(s) tabs", async () => {
  mockChrome({ tabs: [{ url: "https://www.example.com/login?x=1" }] });
  assert.equal(await getActiveTabHost(), "example.com");

  mockChrome({ tabs: [{ url: "http://mail.example.co/" }] });
  assert.equal(await getActiveTabHost(), "mail.example.co");
});

test("getActiveTabHost ignores non-web tabs and missing URLs", async () => {
  mockChrome({ tabs: [{ url: "chrome://extensions" }] });
  assert.equal(await getActiveTabHost(), null);

  mockChrome({ tabs: [{}] });
  assert.equal(await getActiveTabHost(), null);

  mockChrome({ tabs: [] });
  assert.equal(await getActiveTabHost(), null);
});
