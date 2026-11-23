/*
 * Native reference for the byte-for-byte tests where the libdeflate-gzip CLI of the pinned
 * version is not installed (CI): `native-gzip -LEVEL < in > out` writes what
 * `libdeflate-gzip -LEVEL -c` writes for stdin, using the vendored library.
 * Build: ./scripts/build-native-gzip.sh
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "libdeflate.h"

int main(int argc, char **argv) {
  int level = 6;
  if (argc > 1 && argv[1][0] == '-' && strcmp(argv[1], "-V") != 0) level = atoi(argv[1] + 1);
  if (argc > 1 && strcmp(argv[1], "-V") == 0) {
    printf("native-gzip (vendored libdeflate) v%s\n", LIBDEFLATE_VERSION_STRING);
    return 0;
  }
  size_t cap = 1 << 20, n = 0, r;
  unsigned char *in = malloc(cap);
  while (in && (r = fread(in + n, 1, cap - n, stdin)) > 0) {
    n += r;
    if (n == cap) in = realloc(in, cap *= 2);
  }
  struct libdeflate_compressor *c = libdeflate_alloc_compressor(level);
  if (!in || !c) return 2;
  size_t bound = libdeflate_gzip_compress_bound(c, n);
  unsigned char *out = malloc(bound);
  size_t m = out ? libdeflate_gzip_compress(c, in, n, out, bound) : 0;
  if (!m || fwrite(out, 1, m, stdout) != m) return 1;
  return 0;
}
