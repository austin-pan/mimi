import { storage } from "./platform/chrome.js";

const THEME_KEY = "mimi.theme";

// Mirrors the PWA: follow the system preference on first run, remember an
// explicit choice, and drive everything from data-theme on the root element.
export async function initTheme(button) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const saved = await storage.get(THEME_KEY);
  let explicit = saved === "light" || saved === "dark";

  function apply(theme, { persist = false } = {}) {
    document.documentElement.dataset.theme = theme;
    if (button) {
      const next = theme === "dark" ? "light" : "dark";
      button.setAttribute("aria-label", `Use ${next} mode`);
      button.title = `Use ${next} mode`;
    }
    if (persist) {
      storage.set(THEME_KEY, theme);
      explicit = true;
    }
  }

  apply(explicit ? saved : (media.matches ? "dark" : "light"));

  media.addEventListener("change", (event) => {
    if (!explicit) apply(event.matches ? "dark" : "light");
  });

  if (button) {
    button.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      apply(next, { persist: true });
    });
  }
}
