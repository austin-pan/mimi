export function profileCodeFromHash(hash) {
  return new URLSearchParams(hash.replace(/^#/, "")).get("profile");
}
