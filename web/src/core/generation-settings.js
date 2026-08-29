export const RECOMMENDED_LENGTH = 32;

export function resolvePasswordLength(mode, specificLength) {
  return mode === "specific" ? Number(specificLength) : RECOMMENDED_LENGTH;
}
