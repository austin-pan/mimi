import "./styles/style.css";

import * as PasswordConfig from "./password-config.js";
import * as ComponentFactory from "./utils/component-factory.js";
import * as PasswordGenerator from "./generator/password-generator.js"

const contentDiv = document.querySelector("div#content");
const generatedPwComponent = ComponentFactory.createGeneratedPasswordDisplay("generated");
const usernameComponent = ComponentFactory.createTextField("username-container");
const appComponent = ComponentFactory.createTextField("app-container");
const secretComponent = ComponentFactory.createSecretField("secret-container");
const lengthComponent = ComponentFactory.createLengthField("length-container");
const generatorSelectorComponent = ComponentFactory.createGeneratorSelector("generator-selector");

contentDiv.appendChild(generatedPwComponent);
contentDiv.appendChild(usernameComponent);
contentDiv.appendChild(appComponent);
contentDiv.appendChild(secretComponent);
contentDiv.appendChild(lengthComponent);
contentDiv.appendChild(generatorSelectorComponent);

[
  usernameComponent,
  appComponent,
  secretComponent,
  lengthComponent,
  generatorSelectorComponent
]
  .forEach(comp => {
    const inputs = comp.querySelectorAll("input, select");
    inputs.forEach(input => {
      input.addEventListener("change", () => {
        const passwordType = generatorSelectorComponent.querySelector("select").value;

        const username = usernameComponent.querySelector("input").value;
        const app = appComponent.querySelector("input").value;
        const secret = secretComponent.querySelector("input").value;
        const length = parseInt(lengthComponent.querySelector("input").value);

        const options = [
          PasswordConfig.hasDigit,
          PasswordConfig.hasUpper,
          PasswordConfig.hasSpecialCharacter
        ];
        const config = new PasswordConfig.Config(options);

        const seed = [username, app, secret].join(" ");
        const password = PasswordGenerator.generate(passwordType, seed, length, config)
          .replace(/ /g, '<span class="highlighted-space"> </span>');
        generatedPwComponent.querySelector(".generated-display").innerHTML = password;
      });
    });
  });
