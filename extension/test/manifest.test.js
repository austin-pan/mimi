import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await fs.readFile(new URL("../public/manifest.json", import.meta.url), "utf8"),
);

test("manifest is a minimal-permission Manifest V3 extension", () => {
  assert.equal(manifest.manifest_version, 3);
  // Only the reviewed permissions; no broad host access, tabs, or clipboard-read.
  assert.deepEqual(manifest.permissions, ["storage", "activeTab"]);
  assert.ok(!("host_permissions" in manifest), "must not request host permissions");
});

test("CSP allows bundled Argon2 WASM but not remote code", () => {
  const csp = manifest.content_security_policy.extension_pages;
  assert.match(csp, /script-src 'self' 'wasm-unsafe-eval'/);
  assert.doesNotMatch(csp, /https?:/);
  assert.doesNotMatch(csp, /unsafe-inline/);
  assert.doesNotMatch(csp, /'unsafe-eval'/);
});

test("popup, options, and a default keyboard shortcut are wired", () => {
  assert.equal(manifest.action.default_popup, "popup/popup.html");
  assert.equal(manifest.options_ui.page, "options/options.html");
  assert.ok(manifest.commands._execute_action.suggested_key.default, "needs a default shortcut");
});
