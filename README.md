# libdeflate-wasm

**[libdeflate](https://github.com/ebiggers/libdeflate) 1.26 in WebAssembly: DEFLATE, zlib and
gzip up to level 12, byte for byte the same as the native library. 25 kB brotli, zero
dependencies.**

[![npm](https://img.shields.io/npm/v/libdeflate-wasm)](https://www.npmjs.com/package/libdeflate-wasm)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](./package.json)
[![license](https://img.shields.io/npm/l/libdeflate-wasm)](./LICENSE)
[![CI](https://github.com/Konvetto/libdeflate-wasm/actions/workflows/ci.yml/badge.svg)](https://github.com/Konvetto/libdeflate-wasm/actions/workflows/ci.yml)

libdeflate's level 12 makes DEFLATE streams that any zlib, browser or PDF reader opens, and that
are noticeably smaller than zlib's best: on the Flate streams of four real PDFs, 9.2 percent
smaller than fflate at level 9 and 6.5 percent smaller than zlib at level 9. This package is that
compressor, compiled once to a single-threaded wasm file, with a synchronous API after one
`await init()`. It runs in browsers, Web Workers, Node, Deno and Bun.

> **Where it is used:** the [Compress PDF](https://konvetto.com/pdf/compress-pdf) tool on
> Konvetto recompresses every Flate stream of your PDF with it, in your browser. No upload, no
> account, your file never leaves the tab.

## Why libdeflate-wasm

- **Smaller than zlib level 9**: level 12 is libdeflate's near-optimal parser. See
  [Benchmark](#benchmark) for the numbers on PDF streams.
- **Faster at the same size**: level 6 already beats fflate and zlib at level 9 on size, at a
  third of their time.
- **Identical to native libdeflate**: the tests compare every level from 1 to 12 with the
  `libdeflate-gzip` binary of the same version, byte for byte, up to 50 MB of input.
- **Deterministic**: the same input and level give the same bytes on every platform.
- **Small**: 64 kB of wasm (30 kB gzip, 25 kB brotli) and a 2 kB loader. No Emscripten JS glue,
  no threads, no `SharedArrayBuffer`, no special headers.
- **Memory-safe use of wasm**: one compressor per level is allocated once and reused; buffers are
  freed after every call; output is a plain `Uint8Array` you own.

Where it loses: level 12 is about 5 times slower than fflate at level 9 (still around 100 times
faster than Zopfli in our PDF tests). The wasm build runs at about 90 percent of native speed. If you need
streaming or inputs larger than about 1 GB, use a streaming compressor: libdeflate works on whole
buffers.

## Install

```sh
npm install libdeflate-wasm
```

Node 20.16 or newer, any browser with WebAssembly, Deno and Bun. ESM only.

## Usage

```ts
import { init, zlib, deflate, gzip, unzlib } from 'libdeflate-wasm';

await init(); // once, loads libdeflate.wasm next to the module

const flate = zlib(bytes); // zlib stream at level 12, what PDF /FlateDecode wants
const raw = deflate(bytes, 6); // raw DEFLATE, level 0 to 12
const gz = gzip(bytes, 9); // gzip member
const back = unzlib(flate); // and back
```

### In a Web Worker (Vite, webpack 5, Rollup, esbuild)

The module finds its wasm with `new URL('./libdeflate.wasm', import.meta.url)`, which bundlers
turn into an emitted asset:

```ts
// worker.ts
import { init, zlib } from 'libdeflate-wasm';
const ready = init();
self.onmessage = async ({ data }: MessageEvent<Uint8Array>) => {
  await ready;
  const out = zlib(data, 12);
  self.postMessage(out, [out.buffer]);
};
```

With Vite's dev server, add the package to `optimizeDeps.exclude`, because pre-bundling moves
the module away from its wasm file (production builds are fine either way). Or pass the URL
yourself:

```ts
import wasmUrl from 'libdeflate-wasm/libdeflate.wasm?url';
await init(wasmUrl);
```

### Node

```ts
import { init, zlib } from 'libdeflate-wasm';
await init(); // reads the file with node:fs, no fetch
```

### Other ways to load

`init(source)` takes a URL or a string (fetched, or read from disk for `file:`), a `Response`,
the bytes, or a compiled `WebAssembly.Module`. `initSync(bytesOrModule)` does the same
synchronously. Both are no-ops once loaded.

## API

| Function                     | Returns                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `init(source?)`              | `Promise<void>`. Loads the wasm. Safe to call many times.     |
| `initSync(source)`           | Synchronous `init` from bytes or a `WebAssembly.Module`.      |
| `isReady()`                  | `true` once loaded.                                           |
| `deflate(data, level = 12)`  | Raw DEFLATE (RFC 1951).                                       |
| `zlib(data, level = 12)`     | zlib stream (RFC 1950): 2-byte header, DEFLATE, Adler-32.     |
| `gzip(data, level = 12)`     | gzip member (RFC 1952), no file name, mtime 0.                |
| `inflate(data, size?)`       | Raw DEFLATE back to bytes.                                    |
| `unzlib(data, size?)`        | zlib stream back to bytes.                                    |
| `gunzip(data, size?)`        | One gzip member back to bytes (uses the size in its trailer). |
| `release()`                  | Frees the cached compressors and decompressor.                |
| `MAX_LEVEL`, `DEFAULT_LEVEL` | `12`, `12`.                                                   |

Levels: 0 stores without compression, 1 to 9 are close to zlib's speed steps (and smaller),
10 to 12 use libdeflate's near-optimal parser. All functions take a `Uint8Array` (a subarray is
fine) and return a new `Uint8Array`. They throw `RangeError` for a bad level or when wasm memory
runs out, `TypeError` for a non-`Uint8Array` and `Error` for corrupt data.

Pass `size` to the decompressors when you know the exact output length: it is faster and the
call fails if the length differs. Without it the output buffer starts at four times the input
and doubles until the data fits.

### Memory

Each call copies the input into wasm memory, compresses into a buffer of
`libdeflate_*_compress_bound` bytes, copies the result out and frees both. A level 10 to 12
compressor holds a few MB; it is kept for the next call until `release()`. wasm memory grows to
the largest call (about twice the input) and never shrinks, but freed space is reused, so a loop
of large calls does not leak. To hand memory back to the system, drop the worker.

## Benchmark

Every `/FlateDecode` stream of four public PDFs (a NASA report, a glacier report, a
newsletter and a JPL slide deck: 641 streams, 10.8 MB inflated, 3.44 MB as stored in the files),
inflated with node:zlib and compressed again by each contender. Apple M2 Pro, Node 26,
one thread.

| Compressor                       |     Bytes | vs fflate 9 |     Time |
| -------------------------------- | --------: | ----------: | -------: |
| fflate 0.8.3, level 9            | 3,543,787 |       0.00% |   391 ms |
| node:zlib, level 9               | 3,442,684 |      -2.85% |   466 ms |
| libdeflate-wasm, level 6         | 3,412,760 |      -3.70% |   131 ms |
| libdeflate-wasm, level 9         | 3,382,480 |      -4.55% |   250 ms |
| libdeflate-wasm, level 12        | 3,217,739 |      -9.20% | 1,958 ms |
| native libdeflate 1.26, level 12 | 3,217,739 |      -9.20% | 1,754 ms |

The wasm output at level 12 is the native output, byte for byte. Native time is one
`libdeflate-gzip` process over all streams, including file reads and writes. Reproduce with:

```sh
pnpm bench -- a.pdf b.pdf   # needs @cantoo/pdf-lib in PDF_LIB_FROM and libdeflate-gzip
```

### Why no SIMD build

libdeflate's SIMD code is hand-written for x86 and ARM (CRC-32, Adler-32, match finder
initialisation) and is not compiled for wasm. Building with `-msimd128` (auto-vectorisation only)
gave the same speed within 1 percent and a 25 percent larger file, so one baseline build ships,
and it runs on every engine with WebAssembly bulk memory (Chrome 75, Firefox 79, Safari 15,
Node 12 and later).

## Building the wasm

The compiled `src/libdeflate.wasm` is committed, so `pnpm build` needs no C toolchain. To rebuild
it you need Emscripten (7.0.1 is what CI uses):

```sh
pnpm vendor:verify   # vendor/libdeflate matches the pinned release tarball (SHA-256)
pnpm build:wasm      # emcc -O3 -flto, standalone wasm, emmalloc, no JS glue
```

CI rebuilds it from `vendor/` and fails if the result differs from the committed file.

## License

MIT for this package. The wasm contains libdeflate (MIT, Eric Biggers and Google LLC) and parts of
the Emscripten system libraries (MIT / NCSA); see
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md), which ships in the package.

Made by [Konvetto](https://konvetto.com), free tools that run in your browser.
