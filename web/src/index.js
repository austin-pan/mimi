import {
  generateCharactersV2,
  generateWordsV2,
  MAX_LENGTH,
  MIN_LENGTH,
} from "./core/derive-v2.js";
import {
  generateCharactersV1,
  generateWordsV1,
  legacySeed,
} from "./core/legacy.js";
import { createProfile, parseProfileCode } from "./core/profile.js";
import { loadWordBank } from "./core/word-bank.js";

const PROFILE_STORAGE_KEY = "mimi.profile.v1";
const THEME_STORAGE_KEY = "mimi.theme.v1";
const form = document.querySelector("#generator-form");
const profileInput = document.querySelector("#profile-code");
const profilePanel = document.querySelector("#profile-panel");
const profileSummary = document.querySelector("#profile-summary");
const profileStatus = document.querySelector("#profile-status");
const importProfileButton = document.querySelector("#save-profile");
const secretInput = document.querySelector("#secret");
const result = document.querySelector("#password-result");
const status = document.querySelector("#status");
const generateButton = document.querySelector("#generate");
const lengthInput = document.querySelector("#length");
const lengthOutput = document.querySelector("#length-value");
const styleInput = document.querySelector("#style");
const separatorRow = document.querySelector("#separator-row");
const legacyWarning = document.querySelector("#legacy-warning");
const installButton = document.querySelector("#install-app");
const installDialog = document.querySelector("#install-dialog");
const themeButton = document.querySelector("#theme-toggle");
const themeColor = document.querySelector("#theme-color");

let activePassword = "";
let deferredInstallPrompt = null;

function setStatus(message, type = "info") {
  status.textContent = message;
  status.dataset.type = type;
}

function setProfileStatus(message, type = "info") {
  profileStatus.textContent = message;
  profileStatus.dataset.type = type;
}

const themePreference = matchMedia("(prefers-color-scheme: dark)");
let explicitTheme = ["light", "dark"].includes(localStorage.getItem(THEME_STORAGE_KEY));

function applyTheme(theme, { persist = false } = {}) {
  document.documentElement.dataset.theme = theme;
  themeButton.querySelector("span").textContent = theme === "dark" ? "☀" : "☾";
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = `Use ${nextTheme} mode`;
  themeButton.setAttribute("aria-label", label);
  themeButton.title = label;
  themeColor.content = theme === "dark" ? "#1d1921" : "#5f516e";
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    explicitTheme = true;
  }
}

applyTheme(explicitTheme
  ? localStorage.getItem(THEME_STORAGE_KEY)
  : (themePreference.matches ? "dark" : "light"));

themeButton.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme, { persist: true });
});

themePreference.addEventListener("change", (event) => {
  if (!explicitTheme) applyTheme(event.matches ? "dark" : "light");
});

async function saveProfile(code, { collapse = false } = {}) {
  const profile = await parseProfileCode(code);
  localStorage.setItem(PROFILE_STORAGE_KEY, profile.code);
  profileInput.value = profile.code;
  profileSummary.textContent = "Ready on this device";
  if (collapse) profilePanel.open = false;
  return profile;
}

async function initializeProfile() {
  const fragment = new URLSearchParams(location.hash.slice(1)).get("profile");
  const saved = fragment || localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!saved) {
    profilePanel.open = true;
    return;
  }
  try {
    await saveProfile(saved, { collapse: true });
    if (fragment) history.replaceState(null, "", location.pathname + location.search);
  } catch (error) {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    profilePanel.open = true;
    setProfileStatus(error.message, "error");
    setStatus(error.message, "error");
  }
}

document.querySelector("#create-profile").addEventListener("click", async () => {
  const profile = await createProfile();
  localStorage.setItem(PROFILE_STORAGE_KEY, profile.code);
  profileInput.value = profile.code;
  profilePanel.open = true;
  profileSummary.textContent = "New profile — keep a copy";
  setProfileStatus("Created here. Copy this code before setting up another device.", "success");
  setStatus("Your new profile is ready.", "success");
});

importProfileButton.addEventListener("click", async () => {
  const code = profileInput.value.trim();
  if (!code) {
    profilePanel.open = true;
    setProfileStatus("Paste your saved Profile Code above, then choose Import.", "error");
    profileInput.focus();
    return;
  }

  try {
    await saveProfile(code);
    profileSummary.textContent = "Profile imported on this device";
    setProfileStatus("Imported — Mimi will now reproduce the same passwords here.", "success");
    importProfileButton.textContent = "Imported ✓";
    setTimeout(() => { importProfileButton.textContent = "Import"; }, 1800);
    setStatus("Profile imported. You're ready to go.", "success");
  } catch (error) {
    profilePanel.open = true;
    setProfileStatus(error.message, "error");
    profileInput.focus();
    setStatus(error.message, "error");
  }
});

document.querySelector("#copy-profile").addEventListener("click", async () => {
  try {
    const profile = await parseProfileCode(profileInput.value);
    await navigator.clipboard.writeText(profile.code);
    setProfileStatus("Copied — paste this code into Mimi on your other device.", "success");
    setStatus("Profile code copied.", "success");
  } catch (error) {
    setProfileStatus(error.message, "error");
    setStatus(error.message, "error");
  }
});

profileInput.addEventListener("input", () => {
  setProfileStatus("Choose Import after pasting the complete Profile Code.");
});

document.querySelector("#toggle-secret").addEventListener("click", () => {
  const showing = secretInput.type === "text";
  secretInput.type = showing ? "password" : "text";
  document.querySelector("#toggle-secret").textContent = showing ? "Show" : "Hide";
});

document.querySelector("#copy-password").addEventListener("click", async () => {
  if (!activePassword) return;
  await navigator.clipboard.writeText(activePassword);
  setStatus("Copied — ready to paste.", "success");
});

lengthInput.addEventListener("input", () => {
  lengthOutput.value = lengthInput.value;
});

styleInput.addEventListener("change", () => {
  const isWords = styleInput.value.includes("words");
  separatorRow.hidden = !isWords;
  legacyWarning.hidden = !styleInput.value.endsWith("v1");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  generateButton.disabled = true;
  activePassword = "";
  result.textContent = "Making something lovely…";
  setStatus("Mixing your details into something one-of-a-kind…");

  try {
    const data = new FormData(form);
    const style = data.get("style");
    const length = Number(data.get("length"));
    const baseInput = {
      application: data.get("application"),
      username: data.get("username"),
      secret: data.get("secret"),
      kind: data.get("kind"),
      slot: Number(data.get("slot")),
      length,
      separator: data.get("separator"),
      style,
    };

    if (style.endsWith("v1")) {
      const seed = legacySeed(baseInput);
      activePassword = style === "words-v1"
        ? generateWordsV1(seed, length, await loadWordBank("v1"))
        : generateCharactersV1(seed, length);
    } else {
      const profile = await saveProfile(profileInput.value, { collapse: true });
      const input = { ...baseInput, profileSalt: profile.profileSalt };
      activePassword = style === "words-v2"
        ? await generateWordsV2(input, await loadWordBank("v2"))
        : await generateCharactersV2(input);
    }

    result.textContent = activePassword;
    setStatus(`All set · ${activePassword.length} characters`, "success");
  } catch (error) {
    result.textContent = "No password generated";
    setStatus(error.message, "error");
    if (/profile/i.test(error.message)) profilePanel.open = true;
  } finally {
    secretInput.value = "";
    generateButton.disabled = false;
  }
});

const networkState = document.querySelector("#network-state");
networkState.textContent = navigator.onLine ? "Online" : "Offline";
addEventListener("online", () => { networkState.textContent = "Online"; });
addEventListener("offline", () => { networkState.textContent = "Offline"; });

const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
if (standalone) installButton.hidden = true;

const userAgent = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
installDialog.dataset.platform = isIOS ? "ios" : (/Android/i.test(userAgent) ? "android" : "desktop");

addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.dataset.ready = "true";
});

installButton.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    delete installButton.dataset.ready;
    if (outcome === "accepted") installButton.hidden = true;
    return;
  }
  installDialog.showModal();
});

document.querySelector("#close-install").addEventListener("click", () => installDialog.close());
installDialog.addEventListener("click", (event) => {
  if (event.target === installDialog) installDialog.close();
});

addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
  if (installDialog.open) installDialog.close();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {
    setStatus("Offline installation is unavailable in this browser.", "error");
  });
}

lengthInput.min = String(MIN_LENGTH);
lengthInput.max = String(MAX_LENGTH);
initializeProfile();
