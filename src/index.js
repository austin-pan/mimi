import "./styles/style.css";
import visibleIcon from "./res/visibility_FILL0_wght400_GRAD0_opsz24.svg";
import hiddenIcon from "./res/visibility_off_FILL0_wght400_GRAD0_opsz24.svg"
import copyIcon from "./res/content_copy_FILL0_wght400_GRAD0_opsz24.svg"

import { copyContent } from "./utils/clipboard.js";
import { PasswordConfig } from "./config.js";
import { WordPasswordGenerator } from "./generator/word-password-generator.js";

const generator = new WordPasswordGenerator();
const submitBtn = document.querySelector("button#generate");
const generatedPassword = document.querySelector("input#generated-password");
submitBtn.addEventListener("click", (event) => {
  event.preventDefault();
  const config = new PasswordConfig();

  const username = document.querySelector("input#username").value;
  const app = document.querySelector("input#app").value;
  const secret = document.querySelector("input#secret").value;
  const length = parseInt(document.querySelector("input#length").value);

  const seed = [username, app, secret].join(" ");
  const password = generator.generate(seed, length, config);

  generatedPassword.value = password;
});

const pwVisibilityToggle = document.createElement("button");
pwVisibilityToggle.classList.add("field-button", "icon-button");
pwVisibilityToggle.type = "button";
pwVisibilityToggle.innerHTML = visibleIcon;
const secretField = document.querySelector("div#secret-container");
secretField.appendChild(pwVisibilityToggle);
const secret = document.querySelector("input#secret");

pwVisibilityToggle.addEventListener("click", () => {
  if (pwVisibilityToggle.innerHTML === visibleIcon) {
    pwVisibilityToggle.innerHTML = hiddenIcon;
    secret.type = "text";
  } else {
    pwVisibilityToggle.innerHTML = visibleIcon;
    secret.type = "password"
  }
});

const genPwVisibilityToggle = document.createElement("button");
genPwVisibilityToggle.classList.add("field-button", "icon-button");
genPwVisibilityToggle.type = "button";
genPwVisibilityToggle.innerHTML = visibleIcon;
const generatedField = document.querySelector("div#generated-container");
generatedField.appendChild(genPwVisibilityToggle);
const generatedSecret = document.querySelector("input#generated-password");

genPwVisibilityToggle.addEventListener("click", () => {
  if (genPwVisibilityToggle.innerHTML === visibleIcon) {
    genPwVisibilityToggle.innerHTML = hiddenIcon;
    generatedSecret.type = "text";
  } else {
    genPwVisibilityToggle.innerHTML = visibleIcon;
    generatedSecret.type = "password"
  }
});

const copyPassword = document.createElement("button");
copyPassword.classList.add("icon-button");
copyPassword.type = "button";
copyPassword.innerHTML = copyIcon;
generatedField.appendChild(copyPassword);

copyPassword.addEventListener("click", () => {
  copyContent(generatedSecret.value);
});
