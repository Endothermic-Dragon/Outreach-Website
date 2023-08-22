const { execSync } = require("child_process");
const run = (c) => { execSync(`py ${c} || python ${c} || python3 ${c}`) }
if (require.main === module) {
  run("flask_compile.py clean")
} else {
  module.exports = { run: run };
}
