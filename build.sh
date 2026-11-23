#!/usr/bin/env bash
# Precompiles js/*.js (JSX) into one minified file: dist/app.js
# Usage: ./build.sh   (needs Node.js; installs esbuild on first run)
set -e
cd "$(dirname "$0")"
[ -d .build/node_modules/esbuild ] || (mkdir -p .build && cd .build && npm init -y >/dev/null && npm i esbuild >/dev/null)
ORDER="icons constants sync firebase helpers v2 components modals ModelView compare makat_review boundary App"
: > dist/app.src.js
for f in $ORDER; do
  echo "/* ── $f.js ── */" >> dist/app.src.js
  sed -E "s/^const *(\{[^}]*\}) *= *React;/var \1 = React;/" "js/$f.js" >> dist/app.src.js
  printf '\n;\n' >> dist/app.src.js
done
.build/node_modules/.bin/esbuild dist/app.src.js --loader:.js=jsx --jsx=transform \
  --target=es2019 --minify --legal-comments=none --outfile=dist/app.js
rm dist/app.src.js
ls -la dist/app.js
