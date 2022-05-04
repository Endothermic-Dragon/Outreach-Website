const { webpackResources } = require("./compile.js");
const path = require("path");

path.resolve("./compiled")
webpackResources("./src", "./compiled", "production")