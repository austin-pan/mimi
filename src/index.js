import "./style.css";

import { copyContent } from "./clipboardUtils";
import PasswordConfig from "./config";
import PasswordGenerator from "./passwordGenerator";

const submitBtn = document.querySelector("button#generate");
submitBtn.addEventListener("click", (event) => {
  event.preventDefault();
  const config = new PasswordConfig();
  const generator = new PasswordGenerator(config);

  const username = document.querySelector("input#username").value;
  const app = document.querySelector("input#app").value;
  const secret = document.querySelector("input#secret").value;
  const length = parseInt(document.querySelector("input#length").value);

  const seed = username + app + secret;
  const password = generator.generate(seed, length);

  copyContent(password);
})
