const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  entry: {
    "popup/index": "./extension/src/popup/index.js",
    "options/index": "./extension/src/options/index.js",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "extension/dist"),
    clean: true,
  },
  devtool: false,
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "extension/public", to: "." },
        { from: "shared/assets", to: "." },
        { from: "shared/styles/tokens.css", to: "tokens.css" },
        { from: "extension/src/popup/popup.html", to: "popup/popup.html" },
        { from: "extension/src/popup/popup.css", to: "popup/popup.css" },
        { from: "extension/src/options/options.html", to: "options/options.html" },
        { from: "extension/src/options/options.css", to: "options/options.css" },
        { from: "web/public/icons", to: "icons" },
      ],
    }),
  ],
};
