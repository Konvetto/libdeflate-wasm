#!/bin/sh
# Fetches the pinned libdeflate release into vendor/libdeflate and checks its SHA-256.
#   ./scripts/fetch-libdeflate.sh           replace vendor/libdeflate with the pinned release
#   ./scripts/fetch-libdeflate.sh --verify  fail if vendor/libdeflate differs from the release
# To upgrade: change VERSION and SHA256, run without --verify, rebuild the wasm, run the tests.
set -eu
VERSION=1.26
SHA256=bba03fffc5538576213675ce6968fcff6ce2e67d82e4d5febea2d05f9f13cf85
URL="https://github.com/ebiggers/libdeflate/archive/refs/tags/v$VERSION.tar.gz"

cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
curl -sSLf -o "$TMP/src.tar.gz" "$URL"
echo "$SHA256  $TMP/src.tar.gz" | shasum -a 256 -c -
tar -xzf "$TMP/src.tar.gz" -C "$TMP"
SRC="$TMP/libdeflate-$VERSION"
mkdir -p "$TMP/vendor"
cp -R "$SRC/lib" "$SRC/libdeflate.h" "$SRC/common_defs.h" "$SRC/COPYING" "$SRC/NEWS.md" "$TMP/vendor/"

if [ "${1:-}" = "--verify" ]; then
  diff -r "$TMP/vendor" vendor/libdeflate && echo "vendor/libdeflate matches libdeflate v$VERSION"
else
  rm -rf vendor/libdeflate
  mv "$TMP/vendor" vendor/libdeflate
  echo "vendor/libdeflate is now libdeflate v$VERSION"
fi
