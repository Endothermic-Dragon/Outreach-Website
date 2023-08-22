// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const run = require("./run-python.js").run;

run("flask_compile.py")

const webpackData = require("./pages/pages.json");

const isProduction = process.env.NODE_ENV == "production";

const stylesHandler = isProduction
  ? MiniCssExtractPlugin.loader
  : "style-loader";

const config = {
  entry: {},
  output: {
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "./src/static", to: "./static" },
      ],
    }),

    // Add your plugins here
    // Learn more about plugins from https://webpack.js.org/configuration/plugins/
  ],
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [stylesHandler, "css-loader", "postcss-loader", "sass-loader"],
      },
      {
        test: /\.css$/i,
        use: [stylesHandler, "css-loader", "postcss-loader"],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        type: "asset",
      },
      {
        test: /\.(js|mjs|cjs)$/i,
        use: ["babel-loader"],
      },

      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
  watchOptions: {
    ignored: ["**/node_modules", "**/flask_build"],
    poll: 250
  },
};

webpackData["html-pages"].forEach(page => {
  page.html
  && config.plugins.push(
    new HtmlWebpackPlugin({
      template: path.resolve("./flask_build/" + page.html),
      filename: page.chunk + ".html",
      meta: webpackData["html-options"].meta || {},
      chunks: [page.chunk],
    })
  );
  page.bundler
  && (config.entry[page.chunk] = page.bundler.map(
    el => path.resolve("./flask_build/", el)
  ));
})

module.exports = () => {
  if (isProduction) {
    config.mode = "production";

    config.plugins.push(new MiniCssExtractPlugin());
  } else {
    config.mode = "development";
  }
  return config;
};
