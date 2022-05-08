var fs = require("fs");

function read(file, cb) {
  fs.readFile(file, "utf8", function (err, data) {
    if (!err) {
      cb(data.toString());
    } else {
      console.log(err);
    }
  });
}

var minify = require('html-minifier').minify;

try {
  var filePath = process.argv[2]
  read(filePath, function (data) {
    var result = minify(data, {
      collapseWhitespace: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      sortAttributes: true,
      sortClassName: true,
      useShortDoctype: true
    })
    fs.truncate(filePath, (err) => {
      if (err) throw err;
    })
    fs.writeFile(filePath, result, (err) => {
      if (err) throw err;
    })
  });
} catch {
  console.log("Unexpected error encountered.\n");
  console.log("This script is meant to be run by the python file \"compiler.py\" in the master folder.");
  console.log("Are you sure you are running the correct file?\n");
  console.log("If so, are you referencing the correct file?");
}