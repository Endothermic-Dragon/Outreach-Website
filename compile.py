import os

# Set working directory
os.chdir(os.path.dirname(os.path.realpath(__file__)))

# Install any node dependencies
print("Installing dependencies...")
os.system("npm i firebase")
os.system("npm i -D babel-loader @babel/core @babel/preset-env webpack css-loader \
           mini-css-extract-plugin postcss-loader postcss-preset-env sass sass-loader \
           terser-webpack-plugin webpack-cli webpack-remove-empty-scripts webpack")

# Run compiler
print("Compiling files...")
os.system("node compiler_resources/compiler_controller.js -y")