const { webpackResources } = require("./compiler_execute.js");
try {
  if (process.argv[2] != "-py"){
    throw new Error();
  }
  webpackResources("./src", process.argv[3], "../", process.argv[4]);
} catch (error) {
  console.log(error)
  console.log("Unexpected error encountered.\n");
  console.log("This script is meant to be run by the python file \"compiler.py\" in the master folder.");
  console.log("Are you sure you are running the correct file?\n");
  console.log("If so, are you referencing the correct directory?");
}