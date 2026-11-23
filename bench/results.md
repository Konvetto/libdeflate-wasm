# Benchmark results

Output of `pnpm bench` on 2026-11-23 (Apple M2 Pro, Node 26.13.1, libdeflate-gzip 1.26). Inputs:
four public PDFs used by the Konvetto Compress PDF tests (not committed). The README table is
copied from this run.

```text
ks-nasa-report-2023.pdf: 316 streams, 1264144 B in the file, 4394433 B raw
  fflate 0.8.3 level 9: 1366005 B 120 ms | node:zlib level 9: 1312234 B 182 ms | libdeflate-wasm level 6: 1311800 B 52 ms | libdeflate-wasm level 9: 1298808 B 87 ms | libdeflate-wasm level 12: 1256683 B 831 ms | native 12: 1256683 B 823 ms
ks-glacier.pdf: 250 streams, 1499372 B in the file, 4514865 B raw
  fflate 0.8.3 level 9: 1661294 B 148 ms | node:zlib level 9: 1621738 B 255 ms | libdeflate-wasm level 6: 1595403 B 66 ms | libdeflate-wasm level 9: 1581475 B 131 ms | libdeflate-wasm level 12: 1483638 B 736 ms | native 12: 1483638 B 680 ms
ks-newsletter.pdf: 25 streams, 345149 B in the file, 1229390 B raw
  fflate 0.8.3 level 9: 349040 B 113 ms | node:zlib level 9: 347266 B 44 ms | libdeflate-wasm level 6: 346420 B 11 ms | libdeflate-wasm level 9: 346090 B 24 ms | libdeflate-wasm level 12: 328892 B 267 ms | native 12: 328892 B 238 ms
ks-jpl-slides.pdf: 50 streams, 142521 B in the file, 559825 B raw
  fflate 0.8.3 level 9: 152087 B 14 ms | node:zlib level 9: 146889 B 15 ms | libdeflate-wasm level 6: 148201 B 5 ms | libdeflate-wasm level 9: 145700 B 10 ms | libdeflate-wasm level 12: 142343 B 148 ms | native 12: 142343 B 150 ms
```

All files: 3251186 B of Flate streams in the PDFs, 10698513 B inflated

| Compressor                      |   Bytes | vs fflate 9 |    Time |
| ------------------------------- | ------: | ----------: | ------: |
| fflate 0.8.3 level 9            | 3528426 |       0.00% |  395 ms |
| node:zlib level 9               | 3428127 |      -2.84% |  496 ms |
| libdeflate-wasm level 6         | 3401824 |      -3.59% |  134 ms |
| libdeflate-wasm level 9         | 3372073 |      -4.43% |  253 ms |
| libdeflate-wasm level 12        | 3211556 |      -8.98% | 1982 ms |
| native libdeflate 1.26 level 12 | 3211556 |      -8.98% | 1891 ms |
