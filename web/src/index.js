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
const form = document.querySelector("#generator-form");
const profileInput = document.querySelector("#profile-code");
const secretInput = document.querySelector("#secret");
const result = document.querySelector("#password-result");
const status = document.querySelector("#status");
const generateButton = document.querySelector("#generate");
const lengthInput = document.querySelector("#length");
const lengthOutput = document.querySelector("#length-value");
const styleInput = document.querySelector("#style");
const separatorRow = document.querySelector("#separator-row");
const legacyWarning = document.querySelector("#legacy-warning");

let activePassword = "";

function setStatus(message, type = "info") {
  status.textContent = message;
  status.dataset.type = type;
}

async function saveProfile(code) {
  const profile = await parseProfileCode(code);
  localStorage.setItem(PROFILE_STORAGE_KEY, profile.code);
  profileInput.value = profile.code;
  setStatus("Profile ready on this device.", "success");
  return profile;
}

async function initializeProfile() {
  const fragment = new URLSearchParams(location.hash.slice(1)).get("profile");
  const saved = fragment || localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!saved) return;
  try {
    await saveProfile(saved);
    if (fragment) history.replaceState(null, "", location.pathname + location.search);
  } catch (error) {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setStatus(error.message, "error");
  }
}

document.querySelector("#create-profile").addEventListener("click", async () => {
  const profile = await createProfile();
  localStorage.setItem(PROFILE_STORAGE_KEY, profile.code);
  profileInput.value = profile.code;
  setStatus("New profile created. Back up this public code before relying on Mimi.", "success");
});

document.querySelector("#save-profile").addEventListener("click", async () => {
  try {
    await saveProfile(profileInput.value);
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector("#copy-profile").addEventListener("click", async () => {
  try {
    const profile = await parseProfileCode(profileInput.value);
    await navigator.clipboard.writeText(profile.code);
    setStatus("Public profile code copied.", "success");
  } catch (error) {
    setStatus(error.message, "error");
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
  setStatus("Password copied. Clear your clipboard after use.", "success");
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
  result.textContent = "Deriving…";
  setStatus("Argon2id intentionally takes a moment on this device.");

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
      const profile = await saveProfile(profileInput.value);
      const input = { ...baseInput, profileSalt: profile.profileSalt };
      activePassword = style === "words-v2"
        ? await generateWordsV2(input, await loadWordBank("v2"))
        : await generateCharactersV2(input);
    }

    result.textContent = activePassword;
    setStatus(`Generated locally. Exact length: ${activePassword.length}.`, "success");
  } catch (error) {
    result.textContent = "No password generated";
    setStatus(error.message, "error");
  } finally {
    secretInput.value = "";
    generateButton.disabled = false;
  }
});

const networkState = document.querySelector("#network-state");
networkState.textContent = navigator.onLine ? "Online" : "Offline";
addEventListener("online", () => { networkState.textContent = "Online"; });
addEventListener("offline", () => { networkState.textContent = "Offline"; });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {
    setStatus("Offline installation is unavailable in this browser.", "error");
  });
}

lengthInput.min = String(MIN_LENGTH);
lengthInput.max = String(MAX_LENGTH);
initializeProfile();
