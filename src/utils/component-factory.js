import visibleIcon from "../res/visibility_FILL0_wght400_GRAD0_opsz24.svg";
import hiddenIcon from "../res/visibility_off_FILL0_wght400_GRAD0_opsz24.svg"
import copyIcon from "../res/content_copy_FILL0_wght400_GRAD0_opsz24.svg"

import * as Clipboard from "./clipboard.js";
import * as WordsV1 from "../generator/words-v1.js";
import * as CharactersV1 from "../generator/characters-v1.js";

const inputContainerClass = "input-container";

export function createTextField(id) {
  const textFieldDiv = document.createElement("div");
  textFieldDiv.id = id;
  textFieldDiv.classList.add(inputContainerClass);

  const inputField = document.createElement("input");
  inputField.type = "text";
  inputField.autocomplete = "off";
  inputField.autocapitalize = "off";

  textFieldDiv.appendChild(inputField);
  return textFieldDiv;
}

export function createSecretField(id) {
  const secretFieldDiv = document.createElement("div");
  secretFieldDiv.id = id;
  secretFieldDiv.classList.add(inputContainerClass);

  const inputField = document.createElement("input");
  inputField.type = "password";
  inputField.autocomplete = "off";
  inputField.autocapitalize = "off";

  const visibilityToggle = document.createElement("button");
  visibilityToggle.classList.add("field-button", "icon-button", "eye-button");
  visibilityToggle.title = "Show/Hide Password";
  visibilityToggle.type = "button";
  visibilityToggle.innerHTML = visibleIcon;
  visibilityToggle.addEventListener("click", () => {
    if (inputField.type === "password") {
      visibilityToggle.innerHTML = hiddenIcon;
      inputField.type = "text";
    } else {
      visibilityToggle.innerHTML = visibleIcon;
      inputField.type = "password"
    }
  });

  secretFieldDiv.appendChild(inputField);
  secretFieldDiv.appendChild(visibilityToggle);
  return secretFieldDiv;
}

export function createLengthField(id) {
  const lengthFieldDiv = document.createElement("div");
  lengthFieldDiv.id = id;

  const lengthLabel = document.createElement("label");
  lengthLabel.innerText = "Length: ";

  const inputField = document.createElement("input");
  inputField.type = "number";
  inputField.value = "32";
  inputField.min = "13";
  inputField.max = "64";

  const lengthSlider = document.createElement("input");
  lengthSlider.type = "range";
  lengthSlider.value = "32";
  lengthSlider.min = "13";
  lengthSlider.max = "64";

  inputField.addEventListener("input", () => {
    lengthSlider.value = inputField.value
  });

  lengthSlider.addEventListener("input", () =>{
    inputField.value = lengthSlider.value;
  });

  lengthFieldDiv.appendChild(lengthLabel);
  lengthFieldDiv.appendChild(inputField);
  lengthFieldDiv.appendChild(lengthSlider);
  return lengthFieldDiv;
}

export function createGeneratedPasswordDisplay(id) {
  const displayDiv = document.createElement("div");
  displayDiv.id = id;

  const passwordDisplay = document.createElement("div");
  passwordDisplay.classList.add("generated-display");
  passwordDisplay.textContent = "***";

  const copyPasswordButton = document.createElement("button");
  copyPasswordButton.classList.add("icon-button", "copy-button");
  copyPasswordButton.title = "Copy";
  copyPasswordButton.type = "button";
  copyPasswordButton.innerHTML = copyIcon;
  copyPasswordButton.addEventListener("click", () => {
    Clipboard.copy(passwordDisplay.textContent);
  });

  displayDiv.appendChild(passwordDisplay);
  displayDiv.appendChild(copyPasswordButton);

  return displayDiv;
}

export function createGeneratorSelector(id) {
  const selectorDiv = document.createElement("div");
  selectorDiv.id = id;

  const selectorLabel = document.createElement("label");
  selectorLabel.textContent = "Generator: ";

  const selections = [
    WordsV1.id,
    CharactersV1.id
  ];
  const selector = createSelectorElement(selections);

  selectorDiv.appendChild(selectorLabel);
  selectorDiv.appendChild(selector);
  return selectorDiv
}

function createSelectorElement(selections) {
  const selector = document.createElement("select");
  selections.forEach(selection => {
    const option = document.createElement("option");
    option.value = selection;
    option.textContent = selection;
    selector.appendChild(option);
  });
  return selector;
}
