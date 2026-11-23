#!/bin/sh
# Builds src/libdeflate.wasm from vendor/libdeflate with Emscripten.
# The output is committed, so `pnpm build` and consumers never need emcc.
set -eu
cd "$(dirname "$0")/.."
V=vendor/libdeflate
OUT=${OUT:-src/libdeflate.wasm}
EXTRA=${EXTRA_CFLAGS:-}
EXPORTS='_malloc,_free,_libdeflate_alloc_compressor,_libdeflate_free_compressor,_libdeflate_deflate_compress,_libdeflate_deflate_compress_bound,_libdeflate_zlib_compress,_libdeflate_zlib_compress_bound,_libdeflate_gzip_compress,_libdeflate_gzip_compress_bound,_libdeflate_alloc_decompressor,_libdeflate_free_decompressor,_libdeflate_deflate_decompress,_libdeflate_zlib_decompress,_libdeflate_gzip_decompress'
# shellcheck disable=SC2086
emcc -O3 -flto -DNDEBUG $EXTRA \
  -I"$V" \
  "$V/lib/utils.c" "$V/lib/deflate_compress.c" "$V/lib/deflate_decompress.c" \
  "$V/lib/adler32.c" "$V/lib/crc32.c" \
  "$V/lib/zlib_compress.c" "$V/lib/zlib_decompress.c" \
  "$V/lib/gzip_compress.c" "$V/lib/gzip_decompress.c" \
  --no-entry -sSTANDALONE_WASM -sMALLOC=emmalloc \
  -sALLOW_MEMORY_GROWTH -sINITIAL_MEMORY=1MB -sMAXIMUM_MEMORY=4GB -sSTACK_SIZE=64KB \
  -sFILESYSTEM=0 -sASSERTIONS=0 -sERROR_ON_UNDEFINED_SYMBOLS=1 \
  -sEXPORTED_FUNCTIONS="$EXPORTS" \
  -o "$OUT"
ls -l "$OUT"
