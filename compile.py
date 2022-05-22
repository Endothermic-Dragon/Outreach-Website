import os
import json

# Set working directory
os.chdir(os.path.dirname(os.path.realpath(__file__)))

# Open settings
file = open("compile_settings.json")
settings = json.load(file)
file.close()

# Define compile function
def compile_code(quick_compile, node_compile_dir, python_compile_dir, production, clean_up, min_html, inline_resources, outer_references, remove_files):
  # ----- script start -----
  import shutil

  if not quick_compile:
  # Install python libraries
    print("Installing python libraries...")
    if os.name == "nt":
      os.system("py -m pip install flask bs4")
    else:
      os.system("python3 -m pip install flask bs4")

    # Install node dependencies
    print("Installing node libraries...")
    os.system("npm i nodemon -g")
    os.system("npm i")

  # Delete any files in output directory
  print("\nCleaning compiled resources folder...\n")
  shutil.rmtree(node_compile_dir, ignore_errors=True)

  # Run compiler
  print("Compiling CSS and JS...")
  compile_mode = "production" if production else "development"
  os.system("node compiler_scripts/compiler_controller.js -py " + node_compile_dir + " " + compile_mode)

  # Copy static resources
  try:
    shutil.copytree("./src/static", node_compile_dir + "/static")
  except Exception:
    pass

  # Remove empty output from webpack
  shutil.rmtree("dist", ignore_errors=True)

  print("CSS and JS resources compiled.")

  from flask import render_template, Flask
  from bs4 import BeautifulSoup, element

  # Delete any files in output directory
  print("\nCleaning compiled HTML folder...\n")
  shutil.rmtree(python_compile_dir, ignore_errors=True)

  print("Compiling HTML...")
  warnings = []
  app = Flask(__name__, template_folder=node_compile_dir)

  with app.app_context():
    for root, dirs, files in os.walk(node_compile_dir):
      for file in files:
        relPath = (root + "/" + file).replace("\\", "/")

        file_path_out = python_compile_dir + relPath[len(node_compile_dir):]
        folder_path_out = os.path.dirname(file_path_out)
        folder_path_in = os.path.dirname(node_compile_dir + relPath[len(node_compile_dir):])

        if relPath[-12:] == ".LICENSE.txt":
          continue
        elif relPath.split(".")[-1] not in ["html", "jinja-html"]:
          if not inline_resources:
            # Copy file over
            os.makedirs(folder_path_out, exist_ok=True)
            shutil.copy(relPath, file_path_out)
        else:
          # Get flask compiled HTML
          renderedHTML = render_template(relPath[len(node_compile_dir)+1:])

          if inline_resources:
            # Use BeautifulSoup to inject CSS and JS
            soup = BeautifulSoup(renderedHTML, features="html.parser")

            # Replace CSS path to inline CSS
            stylesheets = soup.findAll("link", {"rel": "stylesheet"})
            for s in stylesheets:
              if not (s["href"].startswith("https://") or s["href"].startswith("http://")):
                t = soup.new_tag('style')
                c = element.NavigableString(open(folder_path_in + "/" + s["href"]).read())
                t.insert(0,c)
                s.replaceWith(t)
              else:
                warnings.append(
                  "Note: CSS in HTML file at path " + relPath + " references a URL.\033[0m\n"\
                  + "\tReferences CSS file at \"" + s["href"] + "\"."
                )

            # Replace JS path with inline JS
            scripts = soup.findAll("script", {"src": True})
            for s in scripts:
              if not (s["src"].startswith("https://") or s["src"].startswith("http://")):
                t = soup.new_tag('script')
                c = element.NavigableString(open(folder_path_in + "/" + s["src"]).read())
                t.insert(0,c)
                t['type'] = 'module'
                s.replaceWith(t)
              else:
                warnings.append(
                  "Note: JS in HTML file at path " + relPath + " references a URL.\033[0m\n"\
                  + "\tReferences JS file at \"" + s["src"] + "\"."
                )
            renderedHTML = str(soup)

          # Minimize HTML
          if min_html:
            # Push compiled HTML to pipeline
            pipeline = open("html_pipeline.txt", "w+")
            pipeline.seek(0)
            pipeline.truncate()
            pipeline.write(renderedHTML)
            pipeline.close()

            # Push to compiler, pass pipeline path
            os.system("node compiler_scripts/minify_html.js html_pipeline.txt")
            pipeline = open("html_pipeline.txt", "r")
            renderedHTML = pipeline.read()
            pipeline.close()

          # Save to output directory
          os.makedirs(folder_path_out, exist_ok=True)
          compiled_file = open(file_path_out, "w+")
          compiled_file.write(renderedHTML)
          compiled_file.close()

  # Delete pipeline - no longer necessary
  if os.path.exists("html_pipeline.txt"):
    os.remove("html_pipeline.txt")

  # Copy static resources
  shutil.rmtree(python_compile_dir + "/static", ignore_errors=True)
  try:
    shutil.copytree("./src/static", python_compile_dir + "/static")
  except Exception:
    pass

  print("HTML compiled as per user settings.\n")

  # Delete files from removeFiles list
  for file in remove_files:
    if os.path.exists(python_compile_dir + "/" + file):
      os.remove(python_compile_dir + "/" + file)

  # Delete node-compiled folder
  if clean_up:
    shutil.rmtree(node_compile_dir, ignore_errors=True)

  print("Files deleted as per user settings.")
  print("Your code has compiled successfully!")
  if warnings != [] and outer_references:
    print("\n")
    print("\033[4m\033[93m" + "\n\n\033[4m\033[93m".join(warnings))
    print("\nThe above warnings are not necessarily a bad thing, just an FYI.\n"\
      "You can deactivate these warnings in \"compile.py\".")
  
  if not quick_compile:
    print("What does the compiler actually do?")
    print("\t- Compiles and minimizes \".scss\" files to \".css\" files with wider browser support")
    print("\t- Compiles and minimizes \".js\" files to have polyfills and wider browser support")
    print("\t- Compiles jinja-HTML into regular HTML")
    print("\t- Copies all files in the \"static\" subdirectory without changing them")
    print("")
    print("Here are your next steps:")
    print("\t1. Run \"nodemon route.js\" on the open directory (use separate terminal instance)")
    print("\t2. Write and modify code in the \"src\" subdirectory")
    print("\t\ta. Put all code in its corresponding folders unless absolutely necessary")
    print("\t\tb. Don't be repetitive - use the structure to your advantage!")
    print("\t\tc. Leave comments on what your code does")
    print("\t3. Re-run this compiler")
    print("\t4. View your HTML files at http://localhost/... (path to your HTML file, without the \".html\")")

from datetime import datetime
a = datetime.now()
# Unpack settings and send to compile function
compile_code(**{x: settings[x] for x in settings if x != "resources"}, **settings["resources"])

print(datetime.now() - a)