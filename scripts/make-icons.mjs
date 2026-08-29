import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const PLUM = "#5f516e";
const INK_WHITE = "#ffffff";
const ICON_DIR = new URL("../web/public/icons/", import.meta.url);

// Matches the top-left brand mark: a white italic serif lowercase "m" on a plum
// rounded square (radius ratio 15/46 ≈ 0.326, from the .brand-mark CSS).
function brandSvg({ size, fullBleed }) {
  const radius = fullBleed ? Math.round(size * 0.12) : Math.round(size * 0.326);
  // Full-bleed corners still get plum so OS masking yields a clean rounded tile.
  const bg = fullBleed
    ? `<rect width="${size}" height="${size}" fill="${PLUM}"/>`
      + `<rect width="${size}" height="${size}" rx="${radius}" fill="${PLUM}"/>`
    : `<rect width="${size}" height="${size}" rx="${radius}" fill="${PLUM}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Mimi">`
    + bg
    + `<text x="50%" y="50%" dy="0.02em" text-anchor="middle" dominant-baseline="central"`
    + ` font-family="Georgia, 'Times New Roman', 'Liberation Serif', serif"`
    + ` font-style="italic" font-weight="700" font-size="${Math.round(size * 0.62)}"`
    + ` fill="${INK_WHITE}">m</text></svg>`;
}

async function raster(page, svg, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>*{margin:0}html,body{width:${size}px;height:${size}px}</style>${svg}`,
    { waitUntil: "networkidle" },
  );
  const buffer = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await writeFile(new URL(file, ICON_DIR), buffer);
  console.log("wrote", file);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
await raster(page, brandSvg({ size: 192, fullBleed: true }), 192, "mimi-192.png");
await raster(page, brandSvg({ size: 512, fullBleed: true }), 512, "mimi-512.png");
await writeFile(new URL("mimi.svg", ICON_DIR), brandSvg({ size: 512, fullBleed: false }) + "\n");
console.log("wrote mimi.svg");
await browser.close();
