const { exec } = require("child_process");

function printGreen(s){
  console.log("\x1b[1m\x1b[32m%s\x1b[0m", s)
}

function printRed(s){
  console.log("\x1b[1m\x1b[31m%s\x1b[0m", s)
}

exec("npm i",
() => printGreen("NPM packages installed."),
() => printRed("Failed to install NPM packages.")
).stdout.pipe(process.stdout);

let c = "-m pip install flask shutil"
exec(`py ${c} || python ${c} || python3 ${c}`,
() => printGreen("Python libraries installed."),
() => printRed("Unable to install python libraries. "
+ "Check if you have python installed correctly.")
).stdout.pipe(process.stdout);
