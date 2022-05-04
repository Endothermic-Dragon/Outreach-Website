const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
//const HtmlWebpackInlinePlugin = require('html-webpack-inline-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
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
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [["postcss-preset-env"]],
              },
            },
          },
          {
            loader: "sass-loader",
            options: {
              implementation: require("sass")
            },
          }
        ]
      },
      //-----------------------
      {
        test: /\.html/
      }
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
  configs.push(
    Object.assign({}, config, {
      plugins: [
        //new RemoveEmptyScriptsPlugin(),
        new HtmlWebpackPlugin({
          "filename": "/build/" + page + ".html",
          "template": "/src/" + page + ".html",
          "inlineSource": ".(js|css)$"
        }),
        //new HtmlWebpackInlinePlugin()
        HtmlWebpackInlineSourcePlugin()
      ],
      entry: "/src/" + page + ".html"
    })
  )


  // CSS
  // configs.push(
  //   Object.assign({}, config, {
  //     plugins: [
  //       new MiniCssExtractPlugin({"filename": "../build/style/" + page + ".bundle.css"}),
  //       new RemoveEmptyScriptsPlugin(),
  //     ],
  //     entry: "/src/style/" + page + ".scss"
  //   })
  // );

  // JS
  // configs.push(
  //   Object.assign({}, config, {
  //     entry: "/src/scripts/" + page + ".js",
  //     output: {
  //       path: __dirname + "/build/scripts",
  //       filename: page + ".bundle.js",
  //     }
  //   })
  // );
})


module.exports = configs