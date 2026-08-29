import {
  generateCharactersV2,
  generateWordsV2,
} from "../../../shared/core/derive-v2.js";
import {
  generateCharactersV1,
  generateWordsV1,
  legacySeed,
} from "../../../shared/core/legacy.js";
import { parseProfileCode } from "../../../shared/core/profile.js";
import { loadWordBankFrom } from "../../../shared/core/word-bank.js";
import {
  getRecommendedLength,
  getStrengthGuidance,
  resolvePasswordLength,
} from "../../../shared/core/generation-settings.js";
import {
  getActiveTabHost,
  getAppVersion,
  openOptions,
  storage,
  wordBankUrl,
} from "../platform/chrome.js";
import { initTheme } from "../theme.js";
import { MOON_SVG, SUN_SVG } from "../icons.js";

const PROFILE_KEY = "mimi.profile";
const SITES_KEY = "mimi.sites";

const $ = (selector) => document.querySelector(selector);
const form = $("#generator-form");
const themeButton = $("#theme-toggle");
const applicationInput = form.elements.application;
const usernameInput = form.elements.username;
const secretInput = $("#secret");
const styleInput = $("#style");
const separatorRow = $("#separator-row");
const legacyWarning = $("#legacy-warning");
const lengthInput = $("#length");
const lengthOutput = $("#length-value");
const specificLength = $("#specific-length");
const recommendedLength = $("#recommended-length");
const guidance = $("#length-guidance");
const guidanceLabel = $("#length-guidance-label");
const guidanceSummary = $("#length-guidance-summary");
const result = $("#password-result");
const strength = $("#password-strength");
const strengthLabel = $("#password-strength-label");
const strengthDetails = $("#password-strength-details");
const status = $("#status");
const generateButton = $("#generate");
const siteHint = $("#site-hint");
const profileSummary = $("#profile-summary");
const profileDot = $("#profile-dot");

let activePassword = "";
let activeHost = null;

themeButton.innerHTML = `${MOON_SVG}${SUN_SVG}`;
$("#app-version").textContent = `v${getAppVersion()}`;

function setStatus(message, type = "info") {
  status.textContent = message;
  status.dataset.type = type;
}

function activeLength() {
  const mode = form.elements["length-mode"].value;
  return resolvePasswordLength(mode, lengthInput.value, styleInput.value);
}

function updateGuidance() {
  const style = styleInput.value;
  recommendedLength.textContent = `${getRecommendedLength(style)} characters`;
  const info = getStrengthGuidance(style, activeLength());
  guidance.dataset.level = info.level;
  guidanceLabel.textContent = info.label;
  guidanceSummary.textContent = info.summary;
}

function syncStyleDependants() {
  separatorRow.hidden = !styleInput.value.includes("words");
  legacyWarning.hidden = !styleInput.value.endsWith("v1");
  updateGuidance();
}

$("#toggle-secret").addEventListener("click", () => {
  const showing = secretInput.type === "text";
  secretInput.type = showing ? "password" : "text";
  $("#toggle-secret").textContent = showing ? "Show" : "Hide";
});

$("#manage-profile").addEventListener("click", () => openOptions());

$("#copy-password").addEventListener("click", async () => {
  if (!activePassword) return;
  await navigator.clipboard.writeText(activePassword);
  setStatus("Copied — ready to paste.", "success");
});

lengthInput.addEventListener("input", () => {
  lengthOutput.value = lengthInput.value;
  updateGuidance();
});

for (const mode of form.elements["length-mode"]) {
  mode.addEventListener("change", () => {
    specificLength.hidden = form.elements["length-mode"].value !== "specific";
    updateGuidance();
  });
}

styleInput.addEventListener("change", syncStyleDependants);

function applySitePreset(preset, host) {
  if (host) applicationInput.value = preset?.application || host;
  if (preset?.username) usernameInput.value = preset.username;
  if (preset?.style) styleInput.value = preset.style;
  if (preset?.separator) form.elements.separator.value = preset.separator;
  if (preset?.kind) form.elements.kind.value = preset.kind;
  if (preset?.slot) form.elements.slot.value = preset.slot;
  if (preset?.lengthMode) {
    form.elements["length-mode"].value = preset.lengthMode;
    specificLength.hidden = preset.lengthMode !== "specific";
  }
  if (preset?.length) {
    lengthInput.value = preset.length;
    lengthOutput.value = preset.length;
  }
}

async function saveSitePreset() {
  if (!activeHost) return;
  const sites = (await storage.get(SITES_KEY)) || {};
  sites[activeHost] = {
    application: applicationInput.value.trim(),
    username: usernameInput.value.trim(),
    kind: form.elements.kind.value,
    slot: Number(form.elements.slot.value),
    style: styleInput.value,
    separator: form.elements.separator.value,
    lengthMode: form.elements["length-mode"].value,
    length: Number(lengthInput.value),
  };
  await storage.set(SITES_KEY, sites);
}

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
      const code = await storage.get(PROFILE_KEY);
      if (!code) throw new Error("Set up a Mimi profile first — open Manage.");
      const profile = await parseProfileCode(code);
      const input = { ...baseInput, profileSalt: profile.profileSalt };
      activePassword = style === "words-v2"
        ? await generateWordsV2(input, await loadWordBankFrom(wordBankUrl("v2")))
        : await generateCharactersV2(input);
    }

    result.textContent = activePassword;
    const info = getStrengthGuidance(style, length);
    strength.hidden = false;
    strength.dataset.level = info.level;
    strengthLabel.textContent = info.label;
    strengthDetails.textContent = style.endsWith("v1")
      ? "Legacy output · exact settings required"
      : "Upper & lowercase · number · symbol";
    setStatus(`All set · ${activePassword.length} characters`, "success");
    await saveSitePreset();
  } catch (error) {
    result.textContent = "No password generated";
    setStatus(error.message, "error");
  } finally {
    secretInput.value = "";
    generateButton.disabled = false;
  }
});

async function init() {
  await initTheme(themeButton);

  const code = await storage.get(PROFILE_KEY);
  if (code) {
    profileSummary.textContent = "Profile ready on this device";
    profileDot.dataset.state = "ready";
  } else {
    profileSummary.textContent = "No profile yet — tap Manage to set up";
    profileDot.dataset.state = "none";
  }

  activeHost = await getActiveTabHost();
  const sites = (await storage.get(SITES_KEY)) || {};
  const preset = activeHost ? sites[activeHost] : null;
  applySitePreset(preset, activeHost);
  if (activeHost) {
    siteHint.hidden = false;
    siteHint.textContent = preset
      ? `Filled from your saved settings for ${activeHost}`
      : `App set to ${activeHost} from this tab — edit if needed`;
  }

  syncStyleDependants();
}

init();
