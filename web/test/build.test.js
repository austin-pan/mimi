import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

test("built PWA contains the complete offline shell and no remote generator", async () => {
  const expected = [
    ".nojekyll",
    "icons/mimi-192.png",
    "icons/mimi-512.png",
    "icons/mimi.svg",
    "index.html",
    "main.js",
    "manifest.webmanifest",
    "service-worker.js",
    "style.css",
    "tokens.css",
    "word-bank-v1.txt",
    "word-bank-v2.txt",
  ];
  for (const name of expected) {
    await assert.doesNotReject(fs.access(new URL(`../dist/${name}`, import.meta.url)));
  }
  const bundle = await fs.readFile(new URL("../dist/main.js", import.meta.url), "utf8");
  const html = await fs.readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const packageMetadata = JSON.parse(await fs.readFile(new URL("../../package.json", import.meta.url), "utf8"));
  assert.doesNotMatch(bundle, /\/api\/generate|mimi-zeta-ten|vercel\.app/);
  assert.doesNotMatch(bundle, /\/\/[#@]\s*sourceMappingURL=/);
  assert.match(html, /id=install-app/);
  assert.match(html, /id=install-dialog/);
  assert.match(html, /id=theme-toggle/);
  assert.match(html, new RegExp(`id=app-version>v${packageMetadata.version.replaceAll(".", "\\.")}`));
  assert.match(html, /does not read your clipboard automatically/i);
  assert.match(html, /id=save-profile[^>]*disabled/i);
  assert.match(html, /class=pb-label>Use this code/i);
});
