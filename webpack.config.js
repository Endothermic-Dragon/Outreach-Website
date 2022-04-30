const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlinePlugin = require('html-webpack-inline-plugin');
const TerserPlugin = require("terser-webpack-plugin");

const autoprefixer = require("autoprefixer");

var config = {
  module: {
    rules: [
      //-----------------------
      {
        test: /\.(js)$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          },
          // {
          //   options: {
          //     plugins: [
          //       new HtmlWebpackPlugin(),
          //       new HtmlWebpackInlinePlugin()
          //     ]
          //   }
          // }
        ]
      },
      //-----------------------
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
            }
          },
          // "postcss-loader",
          {
            loader: "postcss-loader",
            options: {
              //plugins: () => [autoprefixer()]
              postcssOptions: {
                  plugins: [
                    [
                      "postcss-preset-env"
                    ]
                  ]
              }
            }
          },
          {
            loader: "sass-loader",
            options: {
              implementation: require("sass")
            },
          }
        ]
      }
      //-----------------------
    ]
  },
  // mode: "development",
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()]
  }
};

var pages = ["test"]//["index", "home", "purpose", "stats", "login", "log"]
var configs = []

pages.forEach(page => {
  // configs.push(
  //   //html
  // )

  // CSS
  configs.push(
    Object.assign({}, config, {
      plugins: [
        new MiniCssExtractPlugin({"filename": "../build/style/" + page + ".bundle.css"}),
        require("autoprefixer"),
        new RemoveEmptyScriptsPlugin(),
      ],
      entry: "/src/style/" + page + ".scss"
    })
  );

  // JS
  configs.push(
    Object.assign({}, config, {
      entry: "/src/scripts/" + page + ".js",
      output: {
        path: __dirname + "/build/scripts",
        filename: page + ".bundle.js",
      }
    })
  );
})


module.exports = configs