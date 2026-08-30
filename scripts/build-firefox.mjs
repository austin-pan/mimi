#!/usr/bin/env node
// Produce a Firefox-signable package from the already-built Chromium extension.
//
// The shared source and the base manifest stay Chrome-clean (Chrome warns on
// unrecognized keys such as `browser_specific_settings`). This script copies
// `extension/dist` to `extension/dist-firefox` and injects only the Gecko-
// specific manifest fields Firefox/AMO require. Run `npm run build:ext` first
// (or use `npm run build:firefox`, which chains both).
//
// AMO signing (listed or unlisted) is a manual step performed against the
// resulting `extension/dist-firefox` folder; see HANDOFF.md.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "extension", "dist");
const target = path.join(root, "extension", "dist-firefox");

// AMO requires a stable add-on id. Firefox gained stable Manifest V3 support
// (action/options/commands and the `wasm-unsafe-eval` CSP keyword) in 109.
const GECKO_SETTINGS = {
  id: "mimi@austin-pan.github.io",
  strict_min_version: "109.0",
};

async function main() {
  try {
    await fs.access(path.join(source, "manifest.json"));
  } catch {
    throw new Error("extension/dist not found — run `npm run build:ext` first.");
  }

  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(source, target, { recursive: true });

  const manifestPath = path.join(target, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  manifest.browser_specific_settings = { gecko: GECKO_SETTINGS };
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    `Firefox package ready at extension/dist-firefox `
    + `(gecko id ${GECKO_SETTINGS.id}, min ${GECKO_SETTINGS.strict_min_version}).`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
