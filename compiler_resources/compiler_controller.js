const { webpackResources } = require("./compiler_execute.js");
try {
  if (process.argv[2] != "-y"){
    throw new Error();
  }
  webpackResources("./src", "./compiled", "../", "production");
} catch {
  console.log("Unexpected error encountered.\n");
  console.log("This script is meant to be run by the python file \"compiler.py\" in the master folder.");
  console.log("Are you sure you are running the correct file?\n");
  console.log("If so, are you referencing the correct directory?");
}