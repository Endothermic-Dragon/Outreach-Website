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

read("./compiled/test.html", function (data) {
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
  console.log(result)
});