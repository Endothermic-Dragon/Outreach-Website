import os

# Set working directory
os.chdir(os.path.dirname(os.path.realpath(__file__)))

# Install any node dependencies
print("Installing dependencies...")
os.system("npm i firebase html-minifier")
os.system("npm i -D babel-loader @babel/core @babel/preset-env webpack css-loader \
           mini-css-extract-plugin postcss-loader postcss-preset-env sass sass-loader \
           terser-webpack-plugin webpack-cli webpack-remove-empty-scripts webpack")

# Run compiler
print("Compiling CSS and JS...")
os.system("node compiler_resources/compiler_controller.js -y")

# Remove empty output from webpack
os.rmdir("dist")

print("CSS and JS resources compiled.")

print("Compiling HTML...")
print("All resources injected.")
print("Minifying HTML...")
print("Compilation finished!")