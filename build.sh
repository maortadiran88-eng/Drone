#!/usr/bin/env bash
# Precompiles js/*.js (JSX) into one minified file: dist/app.js
# Usage: ./build.sh   (needs Node.js; installs esbuild on first run)
set -e
cd "$(dirname "$0")"
[ -d .build/node_modules/esbuild ] || (mkdir -p .build && cd .build && npm init -y >/dev/null && npm i esbuild >/dev/null)
ORDER="toast extras icons constants sync firebase offline helpers v2 components modals ModelView compare makat_review quality trash boundary App"
: > dist/app.src.js
for f in $ORDER; do
  echo "/* ── $f.js ── */" >> dist/app.src.js
  sed -E "s/^const *(\{[^}]*\}) *= *React;/var \1 = React;/" "js/$f.js" >> dist/app.src.js
  printf '\n;\n' >> dist/app.src.js
done
.build/node_modules/.bin/esbuild dist/app.src.js --loader:.js=jsx --jsx=transform \
  --target=es2019 --minify --legal-comments=none --outfile=dist/app.js
rm dist/app.src.js
# מספר גרסה חדש בכל בנייה — כדי שהטלפונים יטענו את הקובץ החדש ולא עותק ישן מהמטמון
sed -i -E "s#dist/app\.js\?v=[0-9]+#dist/app.js?v=$(date +%Y%m%d%H%M%S)#" index.html
ls -la dist/app.js
