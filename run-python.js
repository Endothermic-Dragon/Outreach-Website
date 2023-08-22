const { exec } = require("child_process");
const run = (c) => {exec(`py ${c} || python ${c} || python3 ${c}`)}
if (require.main === module) {
  run("flask_compile.py clean")
} else {
  module.exports = {run: run};
}