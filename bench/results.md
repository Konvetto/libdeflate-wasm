# Benchmark results

Output of `pnpm bench` on 2026-11-23 (Apple M2 Pro, Node 26.13.1, libdeflate-gzip 1.26). Inputs:
four public PDFs used by the Konvetto Compress PDF tests (not committed).

```text
ks-nasa-report-2023.pdf: 316 streams, 1318810 B in the file, 4394433 B raw
  fflate 0.8.3 level 9: 1366020 B 118 ms | node:zlib level 9: 1312252 B 183 ms | libdeflate-wasm level 6: 1311808 B 52 ms | libdeflate-wasm level 9: 1298815 B 88 ms | libdeflate-wasm level 12: 1256670 B 837 ms | native 12: 1256670 B 763 ms
ks-glacier.pdf: 250 streams, 1621953 B in the file, 4604506 B raw
  fflate 0.8.3 level 9: 1676765 B 152 ms | node:zlib level 9: 1636402 B 225 ms | libdeflate-wasm level 6: 1606450 B 62 ms | libdeflate-wasm level 9: 1591983 B 128 ms | libdeflate-wasm level 12: 1489947 B 705 ms | native 12: 1489947 B 626 ms
ks-newsletter.pdf: 25 streams, 349558 B in the file, 1229390 B raw
  fflate 0.8.3 level 9: 349046 B 110 ms | node:zlib level 9: 347269 B 44 ms | libdeflate-wasm level 6: 346419 B 12 ms | libdeflate-wasm level 9: 346089 B 24 ms | libdeflate-wasm level 12: 328892 B 269 ms | native 12: 328892 B 230 ms
ks-jpl-slides.pdf: 50 streams, 148535 B in the file, 559761 B raw
```

All files: 3438856 B of Flate streams in the PDFs, 10788090 B inflated

| Compressor                      |   Bytes | vs fflate 9 |    Time |
| ------------------------------- | ------: | ----------: | ------: |
| fflate 0.8.3 level 9            | 3543787 |       0.00% |  391 ms |
| node:zlib level 9               | 3442684 |      -2.85% |  467 ms |
| libdeflate-wasm level 6         | 3412760 |      -3.70% |  130 ms |
| libdeflate-wasm level 9         | 3382480 |      -4.55% |  250 ms |
| libdeflate-wasm level 12        | 3217739 |      -9.20% | 1958 ms |
| native libdeflate 1.26 level 12 | 3217739 |      -9.20% | 1751 ms |
