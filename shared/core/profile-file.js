// A `.mimi-profile` file is a small, human-readable JSON envelope carrying only
// the public Profile Code. It never contains a master secret or a generated
// password. Its purpose is convenient, error-free transfer of the public salt
// between devices; the receiving client still validates the code's checksum.

export const PROFILE_FILE_EXTENSION = ".mimi-profile";
export const PROFILE_FILE_MIME = "application/json";
const FILE_TYPE = "mimi-profile";
const FILE_VERSION = 1;

export function buildProfileFile(code) {
  if (typeof code !== "string" || !code.trim()) {
    throw new Error("Create or import a Profile Code first");
  }
  const trimmed = code.trim();
  const contents = `${JSON.stringify(
    { app: "mimi", type: FILE_TYPE, version: FILE_VERSION, code: trimmed },
    null,
    2,
  )}\n`;
  // A short, public suffix keeps multiple exported profiles distinguishable
  // without disclosing anything sensitive — the whole code is already public.
  const suffix = trimmed.replace(/[^A-Z0-9]/gi, "").slice(5, 10).toLowerCase() || "profile";
  return {
    filename: `mimi-${suffix}${PROFILE_FILE_EXTENSION}`,
    mime: PROFILE_FILE_MIME,
    contents,
  };
}

// Extract a Profile Code from scanned QR text, which may be either the app's
// import deep link (…#profile=MIMI1-…) or a bare code. Returns the raw candidate
// string; the caller still validates its checksum with parseProfileCode.
export function extractProfileReference(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Nothing was scanned");
  }
  const trimmed = text.trim();
  const hashIndex = trimmed.indexOf("#");
  if (hashIndex !== -1) {
    const fragment = new URLSearchParams(trimmed.slice(hashIndex + 1)).get("profile");
    if (fragment) return fragment.trim();
  }
  return trimmed;
}

export function parseProfileFile(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("The profile file is empty");
  }
  const trimmed = text.trim();

  // Accept a raw Profile Code pasted or saved as plain text, too.
  if (/^MIMI1/i.test(trimmed) && !trimmed.startsWith("{")) {
    return trimmed;
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("This does not look like a Mimi profile file");
  }
  if (!parsed || typeof parsed.code !== "string" || !parsed.code.trim()) {
    throw new Error("The profile file does not contain a Profile Code");
  }
  return parsed.code.trim();
}
