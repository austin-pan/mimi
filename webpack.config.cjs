const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "./web/src/index.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "web/dist"),
    clean: true,
  },
  devtool: false,
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "web/public", to: "." },
        { from: "shared/assets", to: "." },
      ],
    }),
  ],
};
