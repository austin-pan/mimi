const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "./src/index.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  devtool: false,
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "public", to: "." }],
    }),
  ],
};
