const BASE32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PREFIX = "MIMI1";
const encoder = new TextEncoder();

function encodeBase32(bytes) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(value) {
  let bits = 0;
  let accumulator = 0;
  const output = [];
  for (const character of value) {
    const index = BASE32.indexOf(character);
    if (index === -1) throw new Error("Profile code contains an invalid character");
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((accumulator >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

async function checksum(payload) {
  const digest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array([...encoder.encode(PREFIX), ...payload]),
  ));
  return digest.subarray(0, 2);
}

function group(value) {
  return value.match(/.{1,5}/g).join("-");
}

export async function formatProfileCode(profileSalt) {
  if (!(profileSalt instanceof Uint8Array) || profileSalt.length !== 16) {
    throw new Error("Profile salt must contain exactly 16 bytes");
  }
  const body = encodeBase32(new Uint8Array([...profileSalt, ...await checksum(profileSalt)]));
  return `${PREFIX}-${group(body)}`;
}

export async function createProfile() {
  const profileSalt = crypto.getRandomValues(new Uint8Array(16));
  return { profileSalt, code: await formatProfileCode(profileSalt) };
}

export async function parseProfileCode(code) {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized.startsWith(PREFIX)) throw new Error("Profile code must start with MIMI1");
  const encodedBody = normalized.slice(PREFIX.length);
  const decoded = decodeBase32(encodedBody);
  if (decoded.length !== 18) throw new Error("Profile code has the wrong length");
  if (encodeBase32(decoded) !== encodedBody) {
    throw new Error("Profile code is not canonically encoded");
  }
  const profileSalt = decoded.subarray(0, 16);
  const expected = await checksum(profileSalt);
  if (decoded[16] !== expected[0] || decoded[17] !== expected[1]) {
    throw new Error("Profile code checksum does not match");
  }
  return { profileSalt, code: await formatProfileCode(profileSalt) };
}
