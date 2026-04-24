#!/bin/bash
# Build OTA bundle for Android WebView updates.
# Zips web assets from www/, computes SHA-256 hash, updates version.json.
set -e

cd "$(dirname "$0")/.."

if [ ! -f "version.json" ]; then
  echo "ERROR: version.json not found" >&2; exit 1
fi

VERSION=$(python3 -c "import json; print(json.load(open('version.json'))['otaVersionCode'])")
OUT="ota/bundle-v${VERSION}.zip"

mkdir -p ota

echo "[OTA] Building www/..."
npm run build

DIST="www"

for f in index.html app.js; do
  if [ ! -f "$DIST/$f" ]; then
    echo "ERROR: $DIST/$f missing — build may have failed" >&2; exit 1
  fi
done

# Collect all files in www/ (recursively, relative paths)
echo "[OTA] Generating ota_manifest.json..."
MANIFEST="$DIST/ota_manifest.json"
echo '{"files":{' > "$MANIFEST"
FIRST=1
find "$DIST" -type f -not -name 'ota_manifest.json' | sort | while read -r filepath; do
  relpath="${filepath#$DIST/}"
  FHASH=$(shasum -a 256 "$filepath" | cut -d' ' -f1)
  if [ $FIRST -eq 1 ]; then FIRST=0; else printf ',' >> "$MANIFEST"; fi
  printf '"%s":"sha256:%s"' "$relpath" "$FHASH" >> "$MANIFEST"
done
echo '}}' >> "$MANIFEST"

# Create bundle (manifest included since it's in DIST)
echo "[OTA] Packaging bundle v${VERSION}..."
rm -f "$OUT"
(cd "$DIST" && zip -r "../$OUT" .)
rm -f "$MANIFEST"

HASH=$(shasum -a 256 "$OUT" | cut -d' ' -f1)
SIZE=$(wc -c < "$OUT" | tr -d ' ')

# Update version.json
python3 -c "
import json
with open('version.json') as f:
    data = json.load(f)
data['bundleUrl'] = 'https://sol.octile.eu.cc/${OUT}'
data['bundleHash'] = 'sha256:${HASH}'
with open('version.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\n')
"

echo "[OTA] Bundle: $OUT ($SIZE bytes)"
echo "[OTA] SHA-256: $HASH"
echo "[OTA] version.json updated"
