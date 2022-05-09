# ----- settings -----
nodeCompileDir = "./resources_compiled"
pythonCompileDir = "./html_compiled"
production = True
removeFiles = ["template.html"]
# Delete intermediate compilation step (resources_compiled folder from node)
clean_up = True
# Show warnings for non-local link references
outerReferences = True



# ----- script start -----
import os
import shutil

# Install python libraries
print("Installing python libraries...")
if os.name == "nt":
    os.system("py -m pip install flask bs4")
else:
    os.system("python3 -m pip install flask bs4")

# Set working directory
os.chdir(os.path.dirname(os.path.realpath(__file__)))

# Install node dependencies
print("Installing node libraries...")
os.system("npm i")

# Delete any files in output directory
print("\nCleaning compiled resources folder...\n")
shutil.rmtree(nodeCompileDir, ignore_errors=True)

# Run compiler
print("Compiling CSS and JS...")
compileMode = "production" if production else "development"
os.system("node compiler_scripts/compiler_controller.js -py " + nodeCompileDir + " " + compileMode)

# Copy static resources
try:
    shutil.copytree("./src/static", nodeCompileDir + "/static")
except Exception:
    pass

# Remove empty output from webpack
shutil.rmtree("dist", ignore_errors=True)

print("CSS and JS resources compiled.")

from flask import render_template, Flask
from glob import glob
from bs4 import BeautifulSoup, element

# Delete any files in output directory
print("\nCleaning compiled HTML folder...\n")
shutil.rmtree(pythonCompileDir, ignore_errors=True)

print("Compiling HTML...")
warnings = []
app = Flask(__name__, template_folder=nodeCompileDir)
with app.app_context():
    # Iterate over all ".html" files
    for htmlFile in glob(nodeCompileDir + "/**/*.html", recursive=True):
        filePathOut = pythonCompileDir + htmlFile[len(nodeCompileDir):]
        [folderPathOut, fileName] = os.path.split(filePathOut)
        folderPathIn = os.path.dirname(nodeCompileDir + htmlFile[len(nodeCompileDir):])

        # Get flask compiled HTML
        renderedHTML = render_template(htmlFile[len(nodeCompileDir)+1:])

        # Use BeautifulSoup to inject CSS and JS
        soup = BeautifulSoup(renderedHTML, features="html.parser")

        # Replace CSS path to inline CSS
        stylesheets = soup.findAll("link", {"rel": "stylesheet"})
        for s in stylesheets:
            if not (s["href"].startswith("https://") or s["href"].startswith("http://")):
                t = soup.new_tag('style')
                c = element.NavigableString(open(folderPathIn + "/" + s["href"]).read())
                t.insert(0,c)
                s.replaceWith(t)
            else:
                warnings.append(
                    "Note: CSS in HTML file at path " + htmlFile.replace("\\", "/") + " references a URL.\033[0m\n"\
                    + "\tReferences CSS file at \"" + s["href"] + "\"."
                )

        # Replace JS path with inline JS
        scripts = soup.findAll("script", {"src": True})
        for s in scripts:
            if not (s["src"].startswith("https://") or s["src"].startswith("http://")):
                t = soup.new_tag('script')
                c = element.NavigableString(open(folderPathIn + "/" + s["src"]).read())
                t.insert(0,c)
                t['type'] = 'module'
                s.replaceWith(t)
            else:
                warnings.append(
                    "Note: JS in HTML file at path " + htmlFile.replace("\\", "/") + " references a URL.\033[0m\n"\
                    + "\tReferences JS file at \"" + s["src"] + "\"."
                )
        renderedHTML = str(soup)

        # Push compiled HTML to pipeline
        pipeline = open("html_pipeline.txt", "w+")
        pipeline.seek(0)
        pipeline.truncate()
        pipeline.write(renderedHTML)
        pipeline.close()

        # Minimize HTML, pass pipeline path
        if production:
            os.system("node compiler_scripts/minify_html.js html_pipeline.txt")
            pipeline = open("html_pipeline.txt", "r")
            renderedHTML = pipeline.read()
            pipeline.close()

        # Save to output directory
        os.makedirs(folderPathOut, exist_ok=True)
        compiledFile = open(filePathOut, "w+")
        compiledFile.write(renderedHTML)
        compiledFile.close()

# Delete pipeline - no longer necessary
if os.path.exists("html_pipeline.txt"):
    os.remove("html_pipeline.txt")

# Copy static resources
try:
    shutil.copytree("./src/static", pythonCompileDir + "/static")
except Exception:
    pass

print("HTML minified and all resources injected.\n")

for file in removeFiles:
    if os.path.exists(pythonCompileDir + "/" + file):
        os.remove(pythonCompileDir + "/" + file)

if clean_up:
    shutil.rmtree(nodeCompileDir, ignore_errors=True)

print("Files deleted as per user settings.")
print("Your code has compiled successfully!")
if warnings != [] and outerReferences:
    print("\n")
    print("\033[4m\033[93m" + "\n\n\033[4m\033[93m".join(warnings))
    print("\nThe above warnings are not necessarily a bad thing, just an FYI.\n"\
          "You can deactivate these warnings in \"compile.py\".")