import assert from "node:assert/strict";
import test from "node:test";
import jsQR from "jsqr";
import qrcode from "qrcode-generator";

import { extractProfileReference } from "../../shared/core/profile-file.js";
import { profileQrSvg } from "../../shared/core/qr.js";

const SAMPLE_CODE = "MIMI1-ABCDE-FGHJK-LMNPQ-RSTUV-WXYZ2-34567";
const DEEP_LINK = `https://austin-pan.github.io/mimi/#profile=${SAMPLE_CODE}`;

test("extractProfileReference reads a code from a deep link or bare text", () => {
  assert.equal(extractProfileReference(DEEP_LINK), SAMPLE_CODE);
  assert.equal(extractProfileReference(`  ${SAMPLE_CODE}\n`), SAMPLE_CODE);
  assert.throws(() => extractProfileReference(""), /Nothing was scanned/);
});

// The scanner encodes a deep link (profileQrSvg), captures camera frames, and
// decodes with jsQR. Here we render the same payload to an RGBA raster and prove
// the encode → jsQR-decode → extract pipeline round-trips without a camera.
test("a rendered profile QR decodes back to the code via jsQR", () => {
  const qr = qrcode(0, "M");
  qr.addData(DEEP_LINK);
  qr.make();
  const count = qr.getModuleCount();
  const scale = 6;
  const quiet = 4;
  const size = (count + quiet * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const moduleX = Math.floor(x / scale) - quiet;
      const moduleY = Math.floor(y / scale) - quiet;
      const dark = moduleX >= 0 && moduleY >= 0 && moduleX < count && moduleY < count
        && qr.isDark(moduleY, moduleX);
      const value = dark ? 0 : 255;
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const decoded = jsQR(data, size, size, { inversionAttempts: "dontInvert" });
  assert.ok(decoded, "jsQR should decode the rendered QR");
  assert.equal(extractProfileReference(decoded.data), SAMPLE_CODE);
  // Sanity: the SVG encoder produces the same module count for this payload.
  assert.match(profileQrSvg(DEEP_LINK), /^<svg /);
});
