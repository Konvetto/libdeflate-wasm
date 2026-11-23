#!/bin/sh
# Builds bench/out/native-gzip from vendor/libdeflate with the system C compiler.
set -eu
cd "$(dirname "$0")/.."
V=vendor/libdeflate
mkdir -p bench/out
${CC:-cc} -O2 -I"$V" -o bench/out/native-gzip scripts/native-gzip.c \
  "$V/lib/utils.c" "$V/lib/deflate_compress.c" "$V/lib/gzip_compress.c" "$V/lib/crc32.c" \
  "$V/lib/x86/cpu_features.c" "$V/lib/arm/cpu_features.c"
echo bench/out/native-gzip
