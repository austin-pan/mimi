import { createProfile, parseProfileCode } from "../../../shared/core/profile.js";
import { profileQrSvg } from "../../../shared/core/qr.js";
import { buildProfileFile, parseProfileFile } from "../../../shared/core/profile-file.js";
import { getAppVersion, storage } from "../platform/chrome.js";
import { initTheme } from "../theme.js";
import { MOON_SVG, SUN_SVG } from "../icons.js";

const PROFILE_KEY = "mimi.profile";
// Scanning a chrome-extension URL from a phone would go nowhere, so the QR
// encodes the hosted PWA's auto-import deep link: scan it with a phone camera to
// open Mimi on the web and import this (public) profile.
const PWA_IMPORT_URL = "https://austin-pan.github.io/mimi/";

const $ = (selector) => document.querySelector(selector);
const themeButton = $("#theme-toggle");
const profileInput = $("#profile-code");
const profileStatus = $("#profile-status");
const profileQr = $("#profile-qr");
const profileQrCanvas = $("#profile-qr-canvas");
const showQrButton = $("#show-qr");
const fileInput = $("#profile-file-input");

themeButton.innerHTML = `${MOON_SVG}${SUN_SVG}`;
$("#app-version").textContent = `v${getAppVersion()}`;

function setStatus(message, type = "info") {
  profileStatus.textContent = message;
  profileStatus.dataset.type = type;
}

async function persist(code) {
  const profile = await parseProfileCode(code);
  await storage.set(PROFILE_KEY, profile.code);
  profileInput.value = profile.code;
  if (!profileQr.hidden) refreshQr();
  return profile;
}

function importUrl(code) {
  return `${PWA_IMPORT_URL}#profile=${encodeURIComponent(code)}`;
}

async function refreshQr() {
  try {
    const profile = await parseProfileCode(profileInput.value);
    profileQrCanvas.innerHTML = profileQrSvg(importUrl(profile.code));
    return true;
  } catch {
    profileQrCanvas.innerHTML = "";
    return false;
  }
}

$("#create-profile").addEventListener("click", async () => {
  const profile = await createProfile();
  await storage.set(PROFILE_KEY, profile.code);
  profileInput.value = profile.code;
  if (!profileQr.hidden) refreshQr();
  setStatus("Created here. Copy or save this code before setting up another device.", "success");
});

$("#import-profile").addEventListener("click", async () => {
  const code = profileInput.value.trim();
  if (!code) {
    setStatus("Paste your saved Profile Code, then choose Import.", "error");
    profileInput.focus();
    return;
  }
  try {
    await persist(code);
    setStatus("Imported — Mimi will reproduce the same passwords here.", "success");
  } catch (error) {
    setStatus(error.message, "error");
    profileInput.focus();
  }
});

$("#copy-profile").addEventListener("click", async () => {
  try {
    const profile = await parseProfileCode(profileInput.value);
    await navigator.clipboard.writeText(profile.code);
    setStatus("Copied — paste this code into Mimi on your other device.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

profileInput.addEventListener("input", () => {
  if (!profileQr.hidden) refreshQr();
});

showQrButton.addEventListener("click", async () => {
  if (profileQr.hidden) {
    if (!(await refreshQr())) {
      setStatus("Create or import a valid Profile Code before showing its QR.", "error");
      return;
    }
    profileQr.hidden = false;
    showQrButton.textContent = "Hide QR";
    showQrButton.setAttribute("aria-expanded", "true");
  } else {
    profileQr.hidden = true;
    profileQrCanvas.innerHTML = "";
    showQrButton.textContent = "Show QR";
    showQrButton.setAttribute("aria-expanded", "false");
  }
});

$("#export-profile").addEventListener("click", async () => {
  try {
    const profile = await parseProfileCode(profileInput.value);
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
    setStatus(`Saved ${file.filename}. Open it on another device to import.`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

$("#import-file").addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    const code = parseProfileFile(await file.text());
    await persist(code);
    setStatus("Loaded from file — Mimi will reproduce the same passwords here.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    fileInput.value = "";
  }
});

async function init() {
  await initTheme(themeButton);
  const code = await storage.get(PROFILE_KEY);
  if (code) {
    profileInput.value = code;
    setStatus("Profile ready on this device.", "success");
  } else {
    setStatus("Create a new profile, or import one you already use on another device.");
  }
}

init();
