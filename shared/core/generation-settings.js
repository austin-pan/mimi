export const RECOMMENDED_LENGTHS = Object.freeze({
  "words-v2": 42,
  "characters-v2": 20,
  "words-v1": 32,
  "characters-v1": 32,
});

const GOOD_LENGTHS = Object.freeze({
  "words-v2": 32,
  "characters-v2": 16,
});

export function getRecommendedLength(style) {
  return RECOMMENDED_LENGTHS[style] ?? RECOMMENDED_LENGTHS["characters-v2"];
}

export function resolvePasswordLength(mode, specificLength, style) {
  return mode === "specific" ? Number(specificLength) : getRecommendedLength(style);
}

export function getStrengthGuidance(style, length) {
  const recommendedLength = getRecommendedLength(style);

  if (style.endsWith("v1")) {
    return {
      level: "compatibility",
      label: "Compatibility",
      summary: "Use the exact length of your existing legacy password.",
      recommendedLength,
    };
  }

  const level = length >= recommendedLength
    ? "recommended"
    : (length >= GOOD_LENGTHS[style] ? "good" : "short");
  const labels = {
    recommended: "Recommended",
    good: "Good",
    short: "Shorter than recommended",
  };
  const summaries = {
    recommended: `Meets Mimi's ${recommendedLength}-character recommendation for this style.`,
    good: `Usable, but ${recommendedLength} characters is Mimi's recommendation for this style.`,
    short: `Choose ${recommendedLength} characters unless the password field requires less.`,
  };

  return {
    level,
    label: labels[level],
    summary: summaries[level],
    recommendedLength,
  };
}
