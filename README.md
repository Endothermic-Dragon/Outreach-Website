# Setup
Download Python 3 and NodeJS. Then, run setup.py.

# Configuring Program
Add stuff under `html-pages` in `pages/pages.html`. Note that it must be a relative url to `./src/`. The only reason it's in a seperate folder is so that it shows up on top and can be found easily.
- Name the `chunk` what you want your page to be called
- `html` points to the HTML source file
- Your dynamic assets should be under `bundle`
- Your static assets should be under the `static/` folder under `./src/`

# Building Program
## Development Build
`npm run build`

## Production Build
`npm run build:prod`

# Future Note
For some computers, `npm run watch` should automatically watch for changes and recompile. IDK why it doesn't work for MacOS, but oh well.