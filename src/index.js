import "./styles/style.css";

import { copyContent } from "./utils/clipboard";
import PasswordConfig from "./config";
import WordPasswordGenerator from "./generator/wordPasswordGenerator";

const generator = new WordPasswordGenerator();
const submitBtn = document.querySelector("button#generate");
submitBtn.addEventListener("click", (event) => {
  event.preventDefault();
  const config = new PasswordConfig();

  const username = document.querySelector("input#username").value;
  const app = document.querySelector("input#app").value;
  const secret = document.querySelector("input#secret").value;
  const length = parseInt(document.querySelector("input#length").value);

  const seed = [username, app, secret].join(" ");
  const password = generator.generate(seed, length, config);

  copyContent(password);
})
