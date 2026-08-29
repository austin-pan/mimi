import qrcode from "qrcode-generator";

// Renders a Profile Code as a scannable SVG QR. The Profile Code is a public
// salt, so encoding it in a QR discloses nothing secret. The SVG is always
// drawn dark-on-light regardless of the app theme: inverted QR codes are not
// reliably scannable, and the light quiet zone is part of the spec.

const DARK = "#221d28";
const LIGHT = "#ffffff";

export function profileQrSvg(text, { moduleSize = 6, margin = 4 } = {}) {
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("Nothing to encode");
  }
  // Type 0 auto-selects the smallest version that fits; "M" tolerates ~15%
  // damage, a good balance for on-screen scanning.
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  const dimension = (count + margin * 2) * moduleSize;

  let path = "";
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (qr.isDark(row, column)) {
        const x = (column + margin) * moduleSize;
        const y = (row + margin) * moduleSize;
        path += `M${x} ${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}"`,
    ` width="${dimension}" height="${dimension}" role="img"`,
    ` aria-label="QR code of your Mimi Profile Code">`,
    `<rect width="${dimension}" height="${dimension}" fill="${LIGHT}"/>`,
    `<path d="${path}" fill="${DARK}"/>`,
    `</svg>`,
  ].join("");
}
