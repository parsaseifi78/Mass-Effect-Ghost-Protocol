#!/usr/bin/env bash
# Build the installable Ghost Protocol 3D game APK.
# The Activity is written in smali and assembled with the smali toolchain,
# avoiding the need for a Java->DEX compiler (dx/d8).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/apk_app"
AJAR=/usr/share/java/com.android.android-23.jar
OUT="${1:-/tmp/opencode/GhostProtocol2D.apk}"
KS="$ROOT/keys/game2d.jks"
KPASS=ghostprotocol2d
SMALI_CP="/tmp/opencode/smali.jar:/tmp/opencode/dexlib2.jar:/tmp/opencode/antlr-3.5.2.jar:/tmp/opencode/antlr-runtime-3.5.2.jar:/tmp/opencode/util-2.5.2.jar:/tmp/opencode/jcommander-1.64.jar:/tmp/opencode/stringtemplate-3.2.1.jar:/tmp/opencode/guava-27.1-android.jar"

cd "$APP"
rm -rf classes.dex build.apk aligned.apk "$OUT"

# 1. Assemble smali -> classes.dex
java -cp "$SMALI_CP" org.jf.smali.Main assemble -o classes.dex smali

# 2. Package unsigned APK (manifest + resources + assets), then add the dex.
aapt package -f -M AndroidManifest.xml -S res -A assets -I "$AJAR" -F build.apk
aapt add build.apk classes.dex

# 3. Align then sign.
zipalign -f -p 4 build.apk aligned.apk
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -storepass "$KPASS" -keypass "$KPASS" \
    -alias ghost -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Ghost Protocol, OU=Fan Mod, O=Fan, L=NA, ST=NA, C=US" >/dev/null 2>&1
fi
apksigner sign --ks "$KS" --ks-pass "pass:$KPASS" --key-pass "pass:$KPASS" \
  --v1-signing-enabled true --v2-signing-enabled true \
  --out "$OUT" aligned.apk
apksigner verify --print-certs "$OUT"
cp "$OUT" /sdcard/Download/GhostProtocol2D.apk
echo "built $OUT"
