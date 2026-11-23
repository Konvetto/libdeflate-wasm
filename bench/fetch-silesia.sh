#!/bin/sh
# Downloads the Silesia corpus (12 files, 211 MB, https://sun.aei.polsl.pl/~sdeor/corpus/) into
# bench/silesia (gitignored) and checks the SHA-256 of the official zip.
set -eu
SHA256=0626e25f45c0ffb5dc801f13b7c82a3b75743ba07e3a71835a41e3d9f63c77af
URL="https://sun.aei.polsl.pl//~sdeor/corpus/silesia.zip"

cd "$(dirname "$0")"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
curl -sSLf -o "$TMP/silesia.zip" "$URL"
echo "$SHA256  $TMP/silesia.zip" | shasum -a 256 -c -
rm -rf silesia
mkdir silesia
unzip -q "$TMP/silesia.zip" -d silesia
echo "bench/silesia: $(ls silesia | wc -l | tr -d ' ') files"
