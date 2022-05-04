// To do:
// - "Un-promise" webpackResources
//    - Check if necessary first - async crossover error?
// - Add back new RemoveEmptyScriptsPlugin()


// Steps to add a different file type compiling:
// - Figure out whether to copy the file or use a webpack extension
//    - If using a webpack extension, figure out a working script
//        - Isolate what you're compiling in a sub-project
//        - Create webpack.config.js and figure out what settings to use
//        - Define settings as a const next to the other settings
// - Update getIndividualWebpackSettings to change how it handles the file
//    - return "skip" to skip (see HTML)
//    - return {copy_file: true, filePath: filePath} to copy (see Partial for SASS)


const fs = require("fs");
const path = require("path");
const webpack = require("webpack");

const RemoveEmptyScriptsPlugin = require("webpack-remove-empty-scripts");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const base_css_config = {
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
            },
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
              implementation: require("sass"),
            },
          },
        ],
      },
    ],
  },
};

const base_js_config = {
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /(node_modules)/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
};

function getIndividualWebpackSettings(dirPathIn, dirPathOut, filePath, devMode) {
  const [extension] = filePath.split(".").slice(-1);
  if (extension == "html") {
    // HTML
    return {
      copy_file: true,
      filePath: filePath,
    };
  } else if (["scss", "css"].includes(extension)) {
    // CSS
    const [fileName] = filePath.split(/[\/\\]/).slice(-1);
    if (fileName.slice(0, 1) == "_") {
      // Partial for SASS
      return "skip";
    } else if (extension == "scss") {
      // SASS file
      return Object.assign({}, base_css_config, {
        plugins: [
          new MiniCssExtractPlugin({
            filename: "../" + dirPathOut + "/" + filePath.slice(0, -4) + "css",
          }),
          // new RemoveEmptyScriptsPlugin()
        ],
        entry: dirPathIn + "/" + filePath,
        mode: devMode,
      });
    } else {
      // Regular CSS
      return Object.assign({}, base_css_config, {
        plugins: [
          new MiniCssExtractPlugin({
            filename: "../" + dirPathOut + "/" + filePath,
          }),
          // new RemoveEmptyScriptsPlugin()
        ],
        entry: dirPathIn + "/" + filePath,
        mode: devMode,
      });
    }
  } else if (extension == "js") {
    // JS
    const fileSplit = filePath.split(/[\/\\]/);
    const partialDir = fileSplit.slice(0, -1).join("/");
    const [fileName] = fileSplit.slice(-1);
    return Object.assign({}, base_js_config, {
      // plugins: [
      //   new RemoveEmptyScriptsPlugin()
      // ],
      entry: dirPathIn + "/" + filePath,
      output: {
        path: __dirname + "/" + dirPathOut + "/" + partialDir,
        filename: fileName,
      },
      mode: devMode,
    });
  }
}

function childGetFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  var arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = childGetFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

function getAllFiles(dirPath) {
  const files = childGetFiles(dirPath);
  return files.map((filePath) => ".\\" + filePath.slice(dirPath.length - 1));
}

function webpackResources(dirPathIn, dirPathOut, devMode) {
  var webpackSettings = getAllFiles(dirPathIn).map((filePath) =>
    getIndividualWebpackSettings(dirPathIn, dirPathOut, filePath, devMode)
  );

  var promiseList = [];

  for (let settings of webpackSettings) {
    if (settings == "skip") {
      continue;
    }
    if (settings.copy_file) {
      const fileSplit = settings.filePath.split(/\/\\/);
      const partialDir = fileSplit.slice(0, -1).join("/");
      // const [fileName] = fileSplit.slice(-1);
      promiseList.push(
        new Promise(async (resolve) => {
          // Make directories if it does not exist
          let func1 = fs.mkdir(
            dirPathOut + "/" + partialDir,
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );
          func1.on("finish", () => {
            let func2 = fs
              .createReadStream(dirPathIn + "/" + settings.filePath)
              .pipe(fs.createWriteStream(dirPathOut + "/" + settings.filePath));
            func2.on("finish", resolve);
          });
        })
      );
      continue;
    }

    promiseList.push(
      new Promise(async (resolve) => {
        webpack(settings, (err, stats) => {
          if (err) {
            console.error(err.stack || err);
            if (err.details) {
              console.error(err.details);
            }
            return;
          }

          const info = stats.toJson();

          if (stats.hasErrors()) {
            console.error(info.errors);
          }

          if (stats.hasWarnings()) {
            console.warn(info.warnings);
          }
        });
        resolve();
      })
    );
  }

  // fs.rmdir("./dist", { recursive: true }, (err) => {
  //   if (err) {
  //       throw err;
  //   }

  //   console.log(`${dir} is deleted!`);
  // });
}

exports.webpackResources = webpackResources;
