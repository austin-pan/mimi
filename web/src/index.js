import {
  generateCharactersV2,
  generateWordsV2,
  MAX_LENGTH,
  MIN_LENGTH,
} from "../../shared/core/derive-v2.js";
import {
  generateCharactersV1,
  generateWordsV1,
  legacySeed,
} from "../../shared/core/legacy.js";
import { createProfile, parseProfileCode } from "../../shared/core/profile.js";
import { profileCodeFromHash } from "../../shared/core/profile-link.js";
import { profileQrSvg } from "../../shared/core/qr.js";
import { buildProfileFile, parseProfileFile } from "../../shared/core/profile-file.js";
import { loadWordBankFrom } from "../../shared/core/word-bank.js";
import {
  getRecommendedLength,
  getStrengthGuidance,
  resolvePasswordLength,
} from "../../shared/core/generation-settings.js";

function wordBankUrl(version) {
  return new URL(`word-bank-${version}.txt`, document.baseURI);
}
import packageMetadata from "../../package.json";

const PROFILE_STORAGE_KEY = "mimi.profile.v1";
const THEME_STORAGE_KEY = "mimi.theme.v1";
const form = document.querySelector("#generator-form");
const profileInput = document.querySelector("#profile-code");
const profilePanel = document.querySelector("#profile-panel");
const profileSummary = document.querySelector("#profile-summary");
const profileStatus = document.querySelector("#profile-status");
const useProfileButton = document.querySelector("#save-profile");
const copyProfileButton = document.querySelector("#copy-profile");
const showQrButton = document.querySelector("#show-qr");
const profileQr = document.querySelector("#profile-qr");
const profileQrCanvas = document.querySelector("#profile-qr-canvas");
const exportProfileButton = document.querySelector("#export-profile");
const importFileButton = document.querySelector("#import-file");
const profileFileInput = document.querySelector("#profile-file-input");
const secretInput = document.querySelector("#secret");
const result = document.querySelector("#password-result");
const status = document.querySelector("#status");
const generateButton = document.querySelector("#generate");
const lengthInput = document.querySelector("#length");
const lengthOutput = document.querySelector("#length-value");
const specificLength = document.querySelector("#specific-length");
const lengthModes = document.querySelectorAll('input[name="length-mode"]');
const styleInput = document.querySelector("#style");
const separatorRow = document.querySelector("#separator-row");
const legacyWarning = document.querySelector("#legacy-warning");
const recommendedLength = document.querySelector("#recommended-length");
const lengthGuidance = document.querySelector("#length-guidance");
const lengthGuidanceLabel = document.querySelector("#length-guidance-label");
const lengthGuidanceSummary = document.querySelector("#length-guidance-summary");
const passwordStrength = document.querySelector("#password-strength");
const passwordStrengthLabel = document.querySelector("#password-strength-label");
const passwordStrengthDetails = document.querySelector("#password-strength-details");
const installButton = document.querySelector("#install-app");
const installDialog = document.querySelector("#install-dialog");
const themeButton = document.querySelector("#theme-toggle");
const themeColor = document.querySelector("#theme-color");

document.querySelector("#app-version").textContent = `v${packageMetadata.version}`;

let activePassword = "";
let activeProfileCode = "";
let deferredInstallPrompt = null;
let profileInitialization = Promise.resolve();

function setStatus(message, type = "info") {
  status.textContent = message;
  status.dataset.type = type;
}

function setProfileStatus(message, type = "info") {
  profileStatus.textContent = message;
  profileStatus.dataset.type = type;
}

function setButtonLabel(button, label) {
  button.querySelector(".pb-label").textContent = label;
}

function updateProfileActions() {
  const candidate = profileInput.value.trim();
  const isActive = Boolean(activeProfileCode) && candidate === activeProfileCode;
  useProfileButton.disabled = !candidate || isActive;
  for (const button of [copyProfileButton, showQrButton, exportProfileButton]) {
    button.disabled = !isActive;
  }
  if (!isActive && !profileQr.hidden) hideProfileQr();
}

const themePreference = matchMedia("(prefers-color-scheme: dark)");
let explicitTheme = ["light", "dark"].includes(localStorage.getItem(THEME_STORAGE_KEY));

function applyTheme(theme, { persist = false } = {}) {
  document.documentElement.dataset.theme = theme;
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
  activeProfileCode = profile.code;
  profileInput.value = profile.code;
  profileSummary.textContent = "Ready on this device";
  if (collapse) profilePanel.open = false;
  if (!profileQr.hidden) refreshQr();
  updateProfileActions();
  return profile;
}

async function initializeProfile() {
  const linkedCode = profileCodeFromHash(location.hash);
  const storedCode = localStorage.getItem(PROFILE_STORAGE_KEY);
  const candidate = linkedCode || storedCode;
  if (!candidate) {
    profilePanel.open = true;
    updateProfileActions();
    return;
  }
  try {
    await saveProfile(candidate, { collapse: !linkedCode });
    if (linkedCode) {
      profilePanel.open = true;
      profileSummary.textContent = "Profile received and ready";
      setProfileStatus("This Profile Code came from your QR link and is now active on this device.", "success");
      setStatus("Profile received. You're ready to go.", "success");
      history.replaceState(null, "", location.pathname + location.search);
    } else {
      setProfileStatus("This Profile Code is active on this device.", "success");
    }
  } catch (error) {
    if (linkedCode) {
      if (storedCode) {
        try {
          await saveProfile(storedCode);
        } catch {
          localStorage.removeItem(PROFILE_STORAGE_KEY);
          activeProfileCode = "";
          profileInput.value = "";
        }
      }
      history.replaceState(null, "", location.pathname + location.search);
    } else {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      activeProfileCode = "";
      profileInput.value = "";
    }
    profilePanel.open = true;
    setProfileStatus(error.message, "error");
    setStatus(error.message, "error");
    updateProfileActions();
  }
}

function scheduleProfileInitialization() {
  profileInitialization = profileInitialization.then(initializeProfile, initializeProfile);
}

document.querySelector("#create-profile").addEventListener("click", async () => {
  const profile = await createProfile();
  await saveProfile(profile.code);
  profilePanel.open = true;
  profileSummary.textContent = "New profile — keep a copy";
  setProfileStatus("This new Profile Code is already active. Copy, scan, or save it before setting up another device.", "success");
  setStatus("Your new profile is ready.", "success");
});

useProfileButton.addEventListener("click", async () => {
  const code = profileInput.value.trim();
  if (!code) {
    profilePanel.open = true;
    setProfileStatus("Paste a saved Profile Code above, then choose Use this code.", "error");
    profileInput.focus();
    return;
  }

  try {
    await saveProfile(code);
    profileSummary.textContent = "Profile active on this device";
    setProfileStatus("This code is now active. Mimi can reproduce the same passwords here.", "success");
    setButtonLabel(useProfileButton, "Active ✓");
    setTimeout(() => setButtonLabel(useProfileButton, "Use this code"), 1800);
    setStatus("Profile is active. You're ready to go.", "success");
  } catch (error) {
    profilePanel.open = true;
    setProfileStatus(error.message, "error");
    profileInput.focus();
    setStatus(error.message, "error");
  }
});

copyProfileButton.addEventListener("click", async () => {
  try {
    const profile = await parseProfileCode(activeProfileCode);
    await navigator.clipboard.writeText(profile.code);
    setProfileStatus("Copied — paste this code into Mimi on your other device.", "success");
    setStatus("Profile code copied.", "success");
  } catch (error) {
    setProfileStatus(error.message, "error");
    setStatus(error.message, "error");
  }
});

profileInput.addEventListener("input", () => {
  updateProfileActions();
  if (!profileInput.value.trim()) {
    setProfileStatus("Paste a saved Profile Code here, then choose Use this code.");
  } else if (profileInput.value.trim() === activeProfileCode) {
    setProfileStatus("This Profile Code is already active on this device.", "success");
  } else {
    setProfileStatus("Choose Use this code to make the pasted Profile Code active.");
  }
});

function profileImportUrl(code) {
  return `${location.origin}${location.pathname}#profile=${encodeURIComponent(code)}`;
}

function hideProfileQr() {
  profileQr.hidden = true;
  profileQrCanvas.innerHTML = "";
  setButtonLabel(showQrButton, "QR");
  showQrButton.setAttribute("aria-expanded", "false");
}

async function refreshQr() {
  try {
    const profile = await parseProfileCode(profileInput.value);
    profileQrCanvas.innerHTML = profileQrSvg(profileImportUrl(profile.code));
    return true;
  } catch {
    profileQrCanvas.innerHTML = "";
    return false;
  }
}

showQrButton.addEventListener("click", async () => {
  if (profileQr.hidden) {
    if (!(await refreshQr())) {
      setProfileStatus("Create or import a valid Profile Code before showing its QR.", "error");
      return;
    }
    profileQr.hidden = false;
    showQrButton.querySelector(".pb-label").textContent = "Hide";
    showQrButton.setAttribute("aria-expanded", "true");
  } else {
    hideProfileQr();
  }
});

exportProfileButton.addEventListener("click", async () => {
  try {
    const profile = await parseProfileCode(activeProfileCode);
    const file = buildProfileFile(profile.code);
    const blob = new Blob([file.contents], { type: file.mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setProfileStatus(`Saved ${file.filename}. Open it on another device to import.`, "success");
    setStatus("Profile file saved.", "success");
  } catch (error) {
    setProfileStatus(error.message, "error");
    setStatus(error.message, "error");
  }
});

importFileButton.addEventListener("click", () => profileFileInput.click());

profileFileInput.addEventListener("change", async () => {
  const file = profileFileInput.files?.[0];
  if (!file) return;
  try {
    const code = parseProfileFile(await file.text());
    await saveProfile(code);
    profileSummary.textContent = "Profile loaded from file";
    setProfileStatus("Loaded from file — Mimi will reproduce the same passwords here.", "success");
    setStatus("Profile loaded from file. You're ready to go.", "success");
  } catch (error) {
    setProfileStatus(error.message, "error");
    setStatus(error.message, "error");
  } finally {
    profileFileInput.value = "";
  }
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
  updateLengthGuidance();
});

for (const mode of lengthModes) {
  mode.addEventListener("change", () => {
    specificLength.hidden = document.querySelector('input[name="length-mode"]:checked').value !== "specific";
    updateLengthGuidance();
  });
}

function activeLength() {
  const mode = document.querySelector('input[name="length-mode"]:checked').value;
  return resolvePasswordLength(mode, lengthInput.value, styleInput.value);
}

function updateLengthGuidance() {
  const style = styleInput.value;
  const suggestion = getRecommendedLength(style);
  const guidance = getStrengthGuidance(style, activeLength());
  recommendedLength.textContent = `${suggestion} characters`;
  lengthGuidance.dataset.level = guidance.level;
  lengthGuidanceLabel.textContent = guidance.label;
  lengthGuidanceSummary.textContent = guidance.summary;
}

styleInput.addEventListener("change", () => {
  const isWords = styleInput.value.includes("words");
  separatorRow.hidden = !isWords;
  legacyWarning.hidden = !styleInput.value.endsWith("v1");
  updateLengthGuidance();
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
    const length = resolvePasswordLength(data.get("length-mode"), data.get("length"), style);
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
        ? generateWordsV1(seed, length, await loadWordBankFrom(wordBankUrl("v1")))
        : generateCharactersV1(seed, length);
    } else {
      const profile = await saveProfile(profileInput.value, { collapse: true });
      const input = { ...baseInput, profileSalt: profile.profileSalt };
      activePassword = style === "words-v2"
        ? await generateWordsV2(input, await loadWordBankFrom(wordBankUrl("v2")))
        : await generateCharactersV2(input);
    }

    result.textContent = activePassword;
    const guidance = getStrengthGuidance(style, length);
    passwordStrength.hidden = false;
    passwordStrength.dataset.level = guidance.level;
    passwordStrengthLabel.textContent = guidance.label;
    passwordStrengthDetails.textContent = style.endsWith("v1")
      ? "Legacy output · exact settings required"
      : "Upper & lowercase · number · symbol";
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

const networkIndicator = document.querySelector("#network-indicator");
function updateNetworkIndicator() {
  networkIndicator.hidden = navigator.onLine;
}
updateNetworkIndicator();
addEventListener("online", updateNetworkIndicator);
addEventListener("offline", updateNetworkIndicator);

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

const updateBanner = document.querySelector("#update-banner");

function showUpdateBanner(registration) {
  updateBanner.hidden = false;
  document.querySelector("#update-now").onclick = () => {
    if (registration.waiting) registration.waiting.postMessage("SKIP_WAITING");
  };
}

document.querySelector("#update-dismiss").addEventListener("click", () => {
  updateBanner.hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").then((registration) => {
    // Only prompt when a new worker supersedes one already controlling the page.
    if (registration.waiting && navigator.serviceWorker.controller) {
      showUpdateBanner(registration);
    }
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          showUpdateBanner(registration);
        }
      });
    });
  }).catch(() => {
    setStatus("Offline installation is unavailable in this browser.", "error");
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

lengthInput.min = String(MIN_LENGTH);
lengthInput.max = String(MAX_LENGTH);
updateLengthGuidance();
scheduleProfileInitialization();
addEventListener("hashchange", scheduleProfileInitialization);
addEventListener("pageshow", (event) => {
  if (event.persisted) scheduleProfileInitialization();
});
