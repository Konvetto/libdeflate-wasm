# Benchmark results

Output of `pnpm bench` (with `ZOPFLI_15=1`) on 2026-11-23: Apple M2 Pro, Node 26.13.1,
libdeflate-gzip 1.26, one thread, one run (no repeats). Input: the Silesia corpus, 12 files,
211,938,580 bytes (`./bench/fetch-silesia.sh`). Every file is compressed as one zlib stream.
The README table is the total of this run.

```text
dickens: 10192446 B
  fflate 0.8.3, level 9: 3952878 B 337 ms
  pako 3.0.3, level 9: 3840392 B 524 ms
  node:zlib, level 9: 3854735 B 520 ms
  CompressionStream deflate (Node): 3871634 B 421 ms
  libdeflate-wasm, level 6: 3859442 B 284 ms
  libdeflate-wasm, level 9: 3810360 B 590 ms
  libdeflate-wasm, level 12: 3679111 B 1681 ms
  native libdeflate 1.26, level 12: 3679111 B 1283 ms
  @gfx/zopfli 1.0.15, 1 iteration: 3690096 B 4829 ms
  @gfx/zopfli 1.0.15, 15 iterations: 3673386 B 14304 ms
mozilla: 51220480 B
  fflate 0.8.3, level 9: 19312669 B 6004 ms
  pako 3.0.3, level 9: 19361827 B 7791 ms
  node:zlib, level 9: 19044396 B 5575 ms
  CompressionStream deflate (Node): 19089124 B 1494 ms
  libdeflate-wasm, level 6: 18805397 B 617 ms
  libdeflate-wasm, level 9: 18713665 B 2331 ms
  libdeflate-wasm, level 12: 18241318 B 7322 ms
  native libdeflate 1.26, level 12: 18241318 B 6137 ms
  @gfx/zopfli 1.0.15, 1 iteration: 18366811 B 70616 ms
  @gfx/zopfli 1.0.15, 15 iterations: 18317347 B 124917 ms
mr: 9970564 B
  fflate 0.8.3, level 9: 3614289 B 438 ms
  pako 3.0.3, level 9: 3606111 B 761 ms
  node:zlib, level 9: 3660794 B 952 ms
  CompressionStream deflate (Node): 3675941 B 352 ms
  libdeflate-wasm, level 6: 3648650 B 131 ms
  libdeflate-wasm, level 9: 3625182 B 339 ms
  libdeflate-wasm, level 12: 3447991 B 2583 ms
  native libdeflate 1.26, level 12: 3447991 B 2107 ms
  @gfx/zopfli 1.0.15, 1 iteration: 3518738 B 12941 ms
  @gfx/zopfli 1.0.15, 15 iterations: 3450231 B 29781 ms
nci: 33553445 B
  fflate 0.8.3, level 9: 3327488 B 1090 ms
  pako 3.0.3, level 9: 2951402 B 1986 ms
  node:zlib, level 9: 2988001 B 1580 ms
  CompressionStream deflate (Node): 3200188 B 306 ms
  libdeflate-wasm, level 6: 3091747 B 210 ms
  libdeflate-wasm, level 9: 2925249 B 754 ms
  libdeflate-wasm, level 12: 2748279 B 11467 ms
  native libdeflate 1.26, level 12: 2748279 B 9295 ms
  @gfx/zopfli 1.0.15, 1 iteration: 2754529 B 230761 ms
  @gfx/zopfli 1.0.15, 15 iterations: 2740604 B 367876 ms
ooffice: 6152192 B
  fflate 0.8.3, level 9: 3126292 B 248 ms
  pako 3.0.3, level 9: 3168763 B 364 ms
  node:zlib, level 9: 3092926 B 362 ms
  CompressionStream deflate (Node): 3097294 B 232 ms
  libdeflate-wasm, level 6: 3072384 B 94 ms
  libdeflate-wasm, level 9: 3066974 B 170 ms
  libdeflate-wasm, level 12: 2994092 B 624 ms
  native libdeflate 1.26, level 12: 2994092 B 498 ms
  @gfx/zopfli 1.0.15, 1 iteration: 3004717 B 7181 ms
  @gfx/zopfli 1.0.15, 15 iterations: 2992119 B 12630 ms
osdb: 10085684 B
  fflate 0.8.3, level 9: 3783348 B 178 ms
  pako 3.0.3, level 9: 3663036 B 298 ms
  node:zlib, level 9: 3673177 B 257 ms
  CompressionStream deflate (Node): 3695170 B 203 ms
  libdeflate-wasm, level 6: 3660272 B 107 ms
  libdeflate-wasm, level 9: 3654866 B 127 ms
  libdeflate-wasm, level 12: 3608144 B 1029 ms
  native libdeflate 1.26, level 12: 3608144 B 809 ms
  @gfx/zopfli 1.0.15, 1 iteration: 3610788 B 2520 ms
  @gfx/zopfli 1.0.15, 15 iterations: 3607223 B 9400 ms
reymont: 6627202 B
  fflate 0.8.3, level 9: 1900964 B 235 ms
  pako 3.0.3, level 9: 1820704 B 596 ms
  node:zlib, level 9: 1823196 B 682 ms
  CompressionStream deflate (Node): 1860871 B 261 ms
  libdeflate-wasm, level 6: 1876263 B 103 ms
  libdeflate-wasm, level 9: 1806380 B 395 ms
  libdeflate-wasm, level 12: 1696494 B 1317 ms
  native libdeflate 1.26, level 12: 1696494 B 1104 ms
  @gfx/zopfli 1.0.15, 1 iteration: 1713175 B 6391 ms
  @gfx/zopfli 1.0.15, 15 iterations: 1692000 B 13725 ms
samba: 21606400 B
  fflate 0.8.3, level 9: 5529829 B 680 ms
  pako 3.0.3, level 9: 5407478 B 946 ms
  node:zlib, level 9: 5402710 B 687 ms
  CompressionStream deflate (Node): 5451405 B 371 ms
  libdeflate-wasm, level 6: 5337155 B 223 ms
  libdeflate-wasm, level 9: 5270411 B 634 ms
  libdeflate-wasm, level 12: 5118136 B 4320 ms
  native libdeflate 1.26, level 12: 5118136 B 3496 ms
  @gfx/zopfli 1.0.15, 1 iteration: 5149501 B 18523 ms
  @gfx/zopfli 1.0.15, 15 iterations: 5107594 B 52353 ms
sao: 7251944 B
  fflate 0.8.3, level 9: 5406386 B 210 ms
  pako 3.0.3, level 9: 5428595 B 387 ms
  node:zlib, level 9: 5325920 B 334 ms
  CompressionStream deflate (Node): 5331799 B 293 ms
  libdeflate-wasm, level 6: 5335411 B 133 ms
  libdeflate-wasm, level 9: 5323203 B 183 ms
  libdeflate-wasm, level 12: 5250751 B 477 ms
  native libdeflate 1.26, level 12: 5250751 B 374 ms
  @gfx/zopfli 1.0.15, 1 iteration: 5248966 B 6023 ms
  @gfx/zopfli 1.0.15, 15 iterations: 5242400 B 12355 ms
webster: 41458703 B
  fflate 0.8.3, level 9: 12502269 B 968 ms
  pako 3.0.3, level 9: 12008967 B 1822 ms
  node:zlib, level 9: 12073475 B 1498 ms
  CompressionStream deflate (Node): 12213947 B 1029 ms
  libdeflate-wasm, level 6: 12140480 B 560 ms
  libdeflate-wasm, level 9: 11882502 B 1323 ms
  libdeflate-wasm, level 12: 11520877 B 8339 ms
  native libdeflate 1.26, level 12: 11520877 B 6649 ms
  @gfx/zopfli 1.0.15, 1 iteration: 11557595 B 18911 ms
  @gfx/zopfli 1.0.15, 15 iterations: 11518296 B 61108 ms
x-ray: 8474240 B
  fflate 0.8.3, level 9: 5965389 B 210 ms
  pako 3.0.3, level 9: 6256634 B 356 ms
  node:zlib, level 9: 6045038 B 251 ms
  CompressionStream deflate (Node): 6045117 B 267 ms
  libdeflate-wasm, level 6: 5998444 B 108 ms
  libdeflate-wasm, level 9: 5986865 B 123 ms
  libdeflate-wasm, level 12: 5747152 B 431 ms
  native libdeflate 1.26, level 12: 5747152 B 333 ms
  @gfx/zopfli 1.0.15, 1 iteration: 5937033 B 4294 ms
  @gfx/zopfli 1.0.15, 15 iterations: 5744703 B 9893 ms
xml: 5345280 B
  fflate 0.8.3, level 9: 703906 B 91 ms
  pako 3.0.3, level 9: 658651 B 160 ms
  node:zlib, level 9: 658905 B 111 ms
  CompressionStream deflate (Node): 687997 B 65 ms
  libdeflate-wasm, level 6: 684411 B 41 ms
  libdeflate-wasm, level 9: 649500 B 105 ms
  libdeflate-wasm, level 12: 629355 B 1603 ms
  native libdeflate 1.26, level 12: 629355 B 1281 ms
  @gfx/zopfli 1.0.15, 1 iteration: 629619 B 5933 ms
  @gfx/zopfli 1.0.15, 15 iterations: 627175 B 18872 ms
```

All files: 12 files, 211938580 B

| Compressor                        |    Bytes | vs fflate 9 |      Time |
| --------------------------------- | -------: | ----------: | --------: |
| fflate 0.8.3, level 9             | 69125707 |       0.00% |  10689 ms |
| pako 3.0.3, level 9               | 68172560 |      -1.38% |  15991 ms |
| node:zlib, level 9                | 67643273 |      -2.14% |  12809 ms |
| CompressionStream deflate (Node)  | 68220487 |      -1.31% |   5293 ms |
| libdeflate-wasm, level 6          | 67510056 |      -2.34% |   2612 ms |
| libdeflate-wasm, level 9          | 66715157 |      -3.49% |   7074 ms |
| libdeflate-wasm, level 12         | 64681700 |      -6.43% |  41195 ms |
| native libdeflate 1.26, level 12  | 64681700 |      -6.43% |  33366 ms |
| @gfx/zopfli 1.0.15, 1 iteration   | 65181568 |      -5.71% | 388923 ms |
| @gfx/zopfli 1.0.15, 15 iterations | 64713078 |      -6.38% | 727214 ms |
