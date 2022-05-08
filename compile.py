# ----- settings -----
nodeCompileDir = "./resources_compiled"
pythonCompileDir = "./html_compiled"
production = True
removeFiles = ["template.html"]
# Delete intermediate compilation step (resources_compiled folder from node)
clean_up = True



# ----- script start -----
import os
import shutil

# Set working directory
os.chdir(os.path.dirname(os.path.realpath(__file__)))

# Install any node dependencies
os.system("npm i")

print("Cleaning compiled resources folder...")
shutil.rmtree(nodeCompileDir, ignore_errors=True)

# Run compiler
print("Compiling CSS and JS...")
compileMode = "production" if production else "development"
os.system("node compiler_scripts/compiler_controller.js -py " + nodeCompileDir + " " + compileMode)

# Remove empty output from webpack
shutil.rmtree("dist", ignore_errors=True)

print("CSS and JS resources compiled.")

from flask import render_template, Flask
from glob import glob
from bs4 import BeautifulSoup, element

print("Cleaning compiled html folder...")
shutil.rmtree(pythonCompileDir, ignore_errors=True)

print("Compiling HTML...")
app = Flask(__name__, template_folder=nodeCompileDir)
with app.app_context():
    for htmlFile in glob(nodeCompileDir + "/**/*.html", recursive=True):
        filePathOut = pythonCompileDir + htmlFile[len(nodeCompileDir):]
        [folderPathOut, fileName] = os.path.split(filePathOut)
        folderPathIn = os.path.dirname(nodeCompileDir + htmlFile[len(nodeCompileDir):])

        # Get compiled HTML
        renderedHTML = render_template(htmlFile[len(nodeCompileDir)+1:])

        # Inject resources
        soup = BeautifulSoup(renderedHTML, features="html.parser")

        stylesheets = soup.findAll("link", {"rel": "stylesheet"})
        for s in stylesheets:
            t = soup.new_tag('style')
            c = element.NavigableString(open(folderPathIn + "/" + s["href"]).read())
            t.insert(0,c)
            s.replaceWith(t)

        scripts = soup.findAll("script", {"src": True})
        for s in scripts:
            t = soup.new_tag('script')
            c = element.NavigableString(open(folderPathIn + "/" + s["src"]).read())
            t.insert(0,c)
            t['type'] = 'module'
            s.replaceWith(t)
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

        # Save to "./compiled_html"
        os.makedirs(folderPathOut, exist_ok=True)
        compiledFile = open(filePathOut, "w+")
        compiledFile.write(renderedHTML)
        compiledFile.close()

if os.path.exists("html_pipeline.txt"):
    os.remove("html_pipeline.txt")

print("HTML minified and all resources injected.")

for file in removeFiles:
    if os.path.exists(pythonCompileDir + "/" + file):
        os.remove(pythonCompileDir + "/" + file)

if clean_up:
    shutil.rmtree(nodeCompileDir, ignore_errors=True)

print("Files deleted as per user settings.")
print("Compilation finished!")